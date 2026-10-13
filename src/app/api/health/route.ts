import { NextResponse } from "next/server";
import { getHealthStatus } from "@/server/health";
import type { ApiSuccess } from "@/types/api";

export const runtime = "nodejs";

export async function GET() {
  const status = await getHealthStatus();
  const body: ApiSuccess<typeof status> = {
    data: status,
  };

  return NextResponse.json(body);
}
