import { NextResponse } from "next/server";
import { getMqttRuntime } from "@/server/mqtt/runtime";
import type { ApiSuccess } from "@/types/api";
import type { MqttSnapshot } from "@/types/mqtt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const body: ApiSuccess<MqttSnapshot> = { data: getMqttRuntime().snapshot() };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
