import { NextResponse } from "next/server";
import { seedDatabase } from "@/server/db/seed";
import { isDatabaseHealthy } from "@/server/db";
import { ensureEdgeRegistry, seedEdgeRegistry } from "@/server/services/edge-service";
import { getMqttRuntime } from "@/server/mqtt/runtime";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await seedDatabase();
    // The edge registry is derived from the plant data, so a reset rebuilds it too.
    await ensureEdgeRegistry();
    const edge = await seedEdgeRegistry();
    await getMqttRuntime().reload();
    const health = await isDatabaseHealthy();
    return NextResponse.json({
      data: {
        ...result,
        edge,
        databaseStatus: health,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database initialization failed";
    return NextResponse.json(
      { error: { code: "DB_INIT_FAILED", message } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const health = await isDatabaseHealthy();
    return NextResponse.json({ data: health });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      { error: { code: "DB_HEALTH_ERROR", message } },
      { status: 500 }
    );
  }
}
