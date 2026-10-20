import { NextResponse } from "next/server";
import { OpsInputError, listAlarmJournal, listAlarmLog, syncAlarmJournal } from "@/server/services/ops-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { requireMachine, seesMachine } from "@/server/services/access-service";

export const runtime = "nodejs";

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof OpsInputError;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}

/**
 * GET ?machineIds=KLN-01,KLN-02: open and unacknowledged alarm occurrences.
 * GET ?machineId=KLN-01&log=1: the machine's alarm log, every occurrence, newest first.
 */
export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const one = sp.get("machineId");
    const scope = await requestScope(request);
    requireMachine(scope, one);
    if (one && sp.get("log")) return NextResponse.json({ data: await listAlarmLog(one, Number(sp.get("limit") ?? 200)) });
    const ids = (sp.get("machineIds") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((id) => id && seesMachine(scope, id))
      .slice(0, 64);
    return NextResponse.json({ data: await listAlarmJournal(ids) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "ALARM_JOURNAL_ERROR", "Failed to load the alarm journal");
  }
}

/** POST { machineId, at, simTime, raised: [{ ruleId, raisedAt, raisedSimT, triggerTag, triggerValue }] }. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return NextResponse.json({ data: await syncAlarmJournal(body) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "ALARM_JOURNAL_ERROR", "Failed to record alarms");
  }
}
