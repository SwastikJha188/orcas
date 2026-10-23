// Shutdown rules both sides use: the state steps and who may take them, and the
// timeline (cool-down, then each trade's work machine by machine).

import type { ShutdownCrew, ShutdownDetail, ShutdownState } from "../types/shutdown";

/** States in which the line is (being) stopped: one per plant at a time. */
export const ACTIVE_SHUTDOWN: ShutdownState[] = ["stopping", "in_progress", "restarting"];
export const isActiveShutdown = (s: ShutdownState) => ACTIVE_SHUTDOWN.includes(s);
/** States in which the plan (machines, dates) may still change. */
export const PLANNING_SHUTDOWN: ShutdownState[] = ["draft", "approved"];
export const isOpenShutdown = (s: ShutdownState) => s !== "closed" && s !== "cancelled";

export interface ShutdownStep {
  to: ShutdownState;
  /** The button's words. */
  label: string;
  /** Needs approval rights (role can_manage_work_orders). */
  approval: boolean;
  /** The step asks for a note (why, or the sign-off). */
  note: "none" | "optional" | "required";
  /** Main step forward (primary button) or a step back / aside. */
  primary: boolean;
}

/** The steps from each state. */
export const SHUTDOWN_STEPS: Record<ShutdownState, ShutdownStep[]> = {
  draft: [
    { to: "approved", label: "Approve the plan", approval: true, note: "none", primary: true },
    { to: "cancelled", label: "Cancel the shutdown", approval: false, note: "required", primary: false },
  ],
  approved: [
    { to: "stopping", label: "Start the shutdown", approval: true, note: "none", primary: true },
    { to: "draft", label: "Back to planning", approval: false, note: "optional", primary: false },
    { to: "cancelled", label: "Cancel the shutdown", approval: false, note: "required", primary: false },
  ],
  stopping: [
    { to: "in_progress", label: "Start the work", approval: false, note: "none", primary: true },
    { to: "approved", label: "Not stopping after all", approval: true, note: "required", primary: false },
  ],
  in_progress: [{ to: "restarting", label: "Approve the restart", approval: true, note: "required", primary: true }],
  restarting: [{ to: "closed", label: "Close the shutdown", approval: false, note: "optional", primary: true }],
  closed: [],
  cancelled: [],
};

export const shutdownStep = (from: ShutdownState, to: ShutdownState) => SHUTDOWN_STEPS[from].find((s) => s.to === to) ?? null;

/** What still stands in the way of a step (null when it may be taken). */
export function shutdownStepBlocker(
  d: Pick<ShutdownDetail, "state" | "machines" | "isolations" | "work">,
  to: ShutdownState,
  name: (machineId: string) => string = (id) => id,
): string | null {
  if (to === "approved" && d.state === "draft" && !d.machines.length) return "Pick the machines that stop";
  if (to === "in_progress") {
    const without = d.machines.filter((m) => !d.isolations.some((x) => x.machineId === m.machineId && x.isolatedAt && !x.releasedAt));
    if (without.length) return `Lock off at least one point on ${without.length === 1 ? "this machine" : `${without.length} machines`}: ${without.map((m) => name(m.machineId)).join(", ")}`;
  }
  if (to === "restarting") {
    const locked = d.isolations.filter((x) => x.isolatedAt && !x.releasedAt);
    if (locked.length) return `${locked.length} ${locked.length === 1 ? "point is" : "points are"} still locked off or fitted`;
    const open = d.work.filter((i) => !i.moved && !i.done);
    if (open.length) return `${open.length} work ${open.length === 1 ? "item is" : "items are"} not done or moved to the next shutdown`;
  }
  return null;
}

/* ------------------------------------------------------------ timeline */

export interface WorkBlock {
  machineId: string;
  /** maintenance_owners code. */
  trade: string;
  hours: number;
}

export interface ScheduledBlock extends WorkBlock {
  start: number;
  end: number;
}

export interface ShutdownSchedule {
  blocks: ScheduledBlock[];
  /** When each machine may be worked on (after its cool-down). */
  ready: Map<string, number>;
  /** When each machine's work ends (its ready time when it has none). */
  machineEnd: Map<string, number>;
  /** When the last machine's work ends. */
  end: number;
  /** Trades with work but no crew: their hours are not on the timeline. */
  unstaffed: string[];
}

const H = 3_600_000;

/**
 * The shutdown's timeline from `start`. Each machine is ready after its cool-down,
 * counted from `coolFrom` (the stop; `start` when not given). Each trade
 * works as one team, one machine at a time, in the order the machines become
 * ready; a job of `h` hours takes `h ÷ people` working hours, spread over the
 * crew's hours a day. Different trades may work on the same machine at once.
 */
export function scheduleShutdown(
  start: number,
  machines: { machineId: string; cooldownHours: number | null }[],
  work: WorkBlock[],
  crews: ShutdownCrew[],
  coolFrom: number = start,
): ShutdownSchedule {
  const ready = new Map(machines.map((m) => [m.machineId, Math.max(start, coolFrom + (m.cooldownHours ?? 0) * H)]));
  const order = [...machines].map((m) => m.machineId).sort((a, b) => ready.get(a)! - ready.get(b)!);
  const crewOf = new Map(crews.map((c) => [c.owner, c]));
  const hours = new Map<string, Map<string, number>>();
  for (const w of work) {
    if (!(w.hours > 0) || !ready.has(w.machineId)) continue;
    const byMachine = hours.get(w.trade) ?? hours.set(w.trade, new Map()).get(w.trade)!;
    byMachine.set(w.machineId, (byMachine.get(w.machineId) ?? 0) + w.hours);
  }
  const blocks: ScheduledBlock[] = [];
  const unstaffed: string[] = [];
  for (const [trade, byMachine] of hours) {
    const crew = crewOf.get(trade);
    if (!crew) {
      unstaffed.push(trade);
      continue;
    }
    // Elapsed hours per hour of work: shared by the team, only during its working hours.
    const pace = 24 / crew.hoursPerDay / crew.people;
    let free = start;
    for (const m of order) {
      const h = byMachine.get(m);
      if (!h) continue;
      const s = Math.max(free, ready.get(m)!);
      const e = s + h * pace * H;
      blocks.push({ machineId: m, trade, hours: h, start: s, end: e });
      free = e;
    }
  }
  const machineEnd = new Map(ready);
  for (const b of blocks) machineEnd.set(b.machineId, Math.max(machineEnd.get(b.machineId)!, b.end));
  const end = Math.max(start, ...machineEnd.values());
  return { blocks, ready, machineEnd, end, unstaffed };
}

/** Hours of work the timeline expects finished by `t`. */
export function plannedHoursBy(schedule: ShutdownSchedule, t: number): number {
  let sum = 0;
  for (const b of schedule.blocks) {
    if (t >= b.end) sum += b.hours;
    else if (t > b.start) sum += (b.hours * (t - b.start)) / (b.end - b.start);
  }
  return sum;
}
