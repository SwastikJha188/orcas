import { NextRequest, NextResponse } from "next/server";
import { getMachineAcquisition } from "@/server/services/edge-live";
import type { ApiSuccess } from "@/types/api";
import type { MachineAcquisition } from "@/types/edge";
import { failFrom } from "../../_respond";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine } from "@/server/services/access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The machine's mapped points with live readings: gateway → source → card → channel. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    requireMachine(await requestScope(request), id);
    const body: ApiSuccess<MachineAcquisition> = { data: await getMachineAcquisition(id) };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "MACHINE_ACQUISITION_ERROR");
  }
}
