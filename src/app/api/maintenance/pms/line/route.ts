import { NextRequest, NextResponse } from "next/server";
import { getPmsLine } from "@/server/services/pms-service";
import { currentUser, fail } from "../_respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/maintenance/pms/line → plans, work orders, results and audit for every machine on the line. */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ data: await getPmsLine(await currentUser(request)) });
  } catch (error) {
    return fail(error, "PMS_ERROR", "Failed to load planned maintenance");
  }
}
