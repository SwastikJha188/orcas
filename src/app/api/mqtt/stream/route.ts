import { NextRequest } from "next/server";
import { getMqttRuntime } from "@/server/mqtt/runtime";
import { isValidFilter, topicMatchesFilter } from "@/server/mqtt/topics";
import type { MqttTick } from "@/types/mqtt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;
const MAX_FILTERS = 32;

// Server-sent events: one `tick` at most every 250 ms carrying the whole fleet
// state (every broker) plus the traffic seen since the previous tick. `?topics=` takes MQTT
// filters (comma separated) and narrows the traffic feed to matching topics.
export async function GET(request: NextRequest) {
  const filters = (request.nextUrl.searchParams.get("topics") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(isValidFilter)
    .slice(0, MAX_FILTERS);

  const mqtt = getMqttRuntime();
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const event = (tick: MqttTick) => {
        const traffic = filters.length ? tick.traffic.filter((t) => filters.some((f) => topicMatchesFilter(t.topic, f))) : tick.traffic;
        send(`event: tick\ndata: ${JSON.stringify({ ...tick, traffic })}\n\n`);
      };

      send("retry: 3000\n\n");
      event({ snapshot: mqtt.snapshot(), traffic: mqtt.recentTraffic(100) });
      const unsubscribe = mqtt.subscribe(event);
      const heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
        cleanup = () => {};
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
