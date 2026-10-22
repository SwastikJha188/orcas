"use client";

/* ==========================================================================
   Analysis · Sensors window — investigates one abnormal sensor, in the
   eight investigation steps: what changed in the signal, the evidence,
   whether the reading can be trusted, likely causes (sensor, data link,
   process or machine), what it affects, how it is developing, what to do and
   how to confirm. An abnormal reading is not always an abnormal machine.
   ========================================================================== */

import React, { useMemo } from "react";
import { StatusTag, Table, type Column } from "@/components/ui";
import { validityTone, VALIDITY_WORDS } from "@/components/ui/status";
import { displayName } from "@/lib/display-name";
import { formatDuration, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { distinctTexts, faultsForTag, type FaultLibrary } from "../fault-library";
import { detectionRows, isUnknown, offText } from "./an-derive";
import {
  lagOf,
  operatingContext,
  partnersOf,
  qualityRulesOn,
  rulesReading,
  sensorCauses,
  signalChange,
  signalShape,
  type Partner,
  type SignalShape,
} from "./an-intel";
import { Block, CauseTable, Facts, SignalChart, Step, TagButton, Texts, type Subject } from "./an-intel-ui";

const ORIGIN_WORD: Record<string, string> = { online: "Live sensor", calculated: "Worked out from other readings", manual: "Typed in by hand" };

const PATTERNS_OF_NOTE: SignalShape["pattern"][] = ["Missing data", "Flat line", "Step change", "Spike", "Drift", "Oscillation", "Noisy"];

export interface SensorSubject extends Subject {
  tag: string;
  group: number;
}

/**
 * Sensors worth investigating, in a fixed order: not trusted by the sensor
 * checks, flagged by a data check, off expected with no known problem to
 * explain it, then an unusual signal shape; definition order within each.
 * `extra` (a sensor another page asked about) is always listed.
 */
export function sensorSubjects(frame: SimFrame, within: Set<string> | null, extra: string | null): SensorSubject[] {
  const unknown = new Set(detectionRows(frame).filter(isUnknown).map((r) => r.tag));
  const out: SensorSubject[] = [];
  frame.defs.signals.forEach((d, i) => {
    if (within && !within.has(d.tag) && d.tag !== extra) return;
    const s = frame.signals[d.tag];
    if (!s) return;
    const dq = qualityRulesOn(frame, d.tag);
    const shape = d.type === "analog" ? signalShape(frame, d.tag) : null;
    const change = d.type === "analog" ? signalChange(frame, d.tag) : null;
    let group = -1;
    let state = "";
    if (s.quality !== "Good") {
      group = 0;
      state = `${VALIDITY_WORDS[s.quality]}${s.qualityNote ? `: ${s.qualityNote}` : ""}`;
    } else if (dq.length) {
      group = 1;
      state = dq[0].plainTitle || dq[0].name;
    } else if (unknown.has(d.tag)) {
      group = 2;
      state = `Off expected${change?.beganAgo !== null && change?.beganAgo !== undefined ? ` for ${formatDuration(change.beganAgo)}` : ""}, no known problem`;
    } else if (shape && PATTERNS_OF_NOTE.includes(shape.pattern)) {
      group = 3;
      state = shape.detail;
    } else if (d.tag === extra) {
      group = 4;
      state = shape?.pattern === "Off expected" ? "Off expected" : "Reading as expected";
    }
    if (group < 0) return;
    out.push({
      key: d.tag,
      tag: d.tag,
      group: group * 1000 + i,
      title: displayName(d.name),
      where: frame.defs.subassemblies.find((x) => x.id === d.sub)?.name ?? d.sub,
      state,
      how: shape?.pattern ?? (s.state ? `State: ${s.state}` : null),
      tone: s.quality === "Invalid" ? "bad" : group <= 3 ? "warn" : undefined,
    });
  });
  return out.sort((a, b) => a.group - b.group);
}

export function SensorInvestigation({
  tag,
  frame,
  library,
  onOpenTrend,
  onInvestigateProblem,
}: {
  tag: string;
  frame: SimFrame;
  library: FaultLibrary | null;
  onOpenTrend: (tag: string) => void;
  /** Open the Diagnosis window on a problem the sensor is evidence for. */
  onInvestigateProblem: (ruleId: string) => void;
}) {
  const def = frame.defs.signalByTag[tag];
  const s = frame.signals[tag];
  const analog = def?.type === "analog";
  const shape = useMemo(() => (analog ? signalShape(frame, tag) : null), [analog, frame, tag]);
  const change = useMemo(() => (analog ? signalChange(frame, tag) : null), [analog, frame, tag]);
  const partners = useMemo(() => (analog ? partnersOf(frame, tag) : []), [analog, frame, tag]);
  const ctx = useMemo(() => operatingContext(frame, change?.beganAgo ?? null), [frame, change?.beganAgo]);
  const causes = useMemo(() => (shape ? sensorCauses(frame, tag, shape, partners, ctx) : []), [frame, tag, shape, partners, ctx]);
  const dq = qualityRulesOn(frame, tag);
  const reading = rulesReading(frame, tag);
  const lib = faultsForTag(library, tag);
  const lag = lagOf(frame, tag);
  if (!def || !s) return <p className="pg-analysis-empty">This sensor is not on this machine.</p>;

  const name = displayName(def.name);
  const unit = def.unit && def.unit !== "state" ? def.unit : "";
  const sub = frame.defs.subassemblies.find((x) => x.id === def.sub);
  const subHealth = frame.subs[def.sub]?.health;
  const off = s.z !== null && Math.abs(s.z) > 2;
  const moved = partners.filter((p) => p.moved);
  const still = partners.filter((p) => !p.moved && p.quality === "Good");
  const trust: { word: string; why: string } =
    s.quality === "Invalid"
      ? { word: "No", why: "it failed the sensor checks" }
      : s.quality === "Suspect" || dq.length
        ? { word: "In doubt", why: s.quality === "Suspect" ? "the sensor checks marked it suspect" : "a data check flags it" }
        : off && still.length && !moved.length
          ? { word: "In doubt", why: "it moved while the sensors that usually move with it did not" }
          : { word: "Yes", why: off && moved.length ? "it passes the sensor checks and its neighbours moved with it" : "it passes the sensor checks" };
  const leading = causes.find((c) => c.status === "Leading") ?? null;
  const val = (v: number | null) => (v === null ? "—" : `${Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)}${unit ? ` ${unit}` : ""}`);

  const todo: string[] = [...dq.map((r) => r.plainTodo || r.action).filter(Boolean)];
  if (leading?.key === "sensor") todo.push("Check the sensor, its wiring and its calibration before acting on this reading");
  if (leading?.key === "link") todo.push("Check the connection from the sensor to the gateway");
  if (leading?.key === "process") todo.push("Compare with what the operators changed at that time");
  if (leading?.key === "machine") for (const r of reading.filter((x) => x.status !== "QUIET")) todo.push(r.plainTodo || r.action);
  if (!todo.length) todo.push(s.quality === "Good" && !off ? "Nothing: the reading is trusted and as expected" : "Watch it: no single cause stands out yet");

  const partnerCols: Column<Partner>[] = [
    {
      key: "sensor",
      header: "Sensor",
      render: (p) => (
        <span className="ast-cell-stack">
          <TagButton tag={p.tag} name={p.name} onOpenTrend={onOpenTrend} />
          <span className="ast-cell-sub">{p.sub}</span>
        </span>
      ),
    },
    { key: "r", header: "Moved together before", width: "170px", render: (p) => <span className="ast-num">{p.r.toFixed(2)}</span> },
    { key: "now", header: "Now", width: "150px", render: (p) => <span className="ast-num">{p.z === null ? "—" : Math.abs(p.z) < 2 ? "As expected" : offText(p.z)}</span> },
    {
      key: "agree",
      header: "Agrees with it?",
      width: "140px",
      render: (p) =>
        p.quality !== "Good" ? (
          <StatusTag tone={validityTone(p.quality)} label={VALIDITY_WORDS[p.quality]} />
        ) : p.moved === off ? (
          <span className="ast-muted">Yes</span>
        ) : (
          <span className="pg-an-strong">No</span>
        ),
    },
  ];

  return (
    <>
      <Step n={1} title="What changed in the signal">
        <Facts
          rows={[
            { label: "Signal", value: shape ? `${shape.pattern}: ${shape.detail}` : s.state ? `State: ${s.state}` : null, basis: "inferred" },
            {
              label: "Reading",
              value: analog ? `${val(s.value)} now, ${val(s.model)} expected${change?.changePct !== null && change?.changePct !== undefined ? ` (${change.changePct >= 0 ? "+" : "−"}${Math.abs(change.changePct).toFixed(1)} %)` : ""}` : s.display,
              basis: "measured",
            },
            { label: "Began", value: change?.beganAgo !== null && change?.beganAgo !== undefined ? `${formatDuration(change.beganAgo)} ago, ${change.pattern.toLowerCase()}` : null, basis: "measured" },
          ]}
        />
        {analog && <SignalChart frame={frame} tag={tag} label={name} />}
      </Step>

      <Step n={2} title="Evidence">
        <Facts
          rows={[
            {
              label: "Sensor checks",
              value: s.quality === "Good" ? VALIDITY_WORDS.Valid : <StatusTag tone={validityTone(s.quality)} label={`${VALIDITY_WORDS[s.quality]}${s.qualityNote ? `: ${s.qualityNote}` : ""}`} />,
              basis: "measured",
            },
            { label: "Data checks", value: dq.length ? <Texts items={dq.map((r) => r.plainTitle || r.name)} /> : "None flag it", basis: "measured" },
            { label: "Last value", value: lag !== null ? (lag > 2 ? `${formatDuration(lag)} old` : "On time") : null, basis: "measured" },
            { label: "Source", value: [ORIGIN_WORD[def.origin ?? "online"], def.instrument].filter(Boolean).join(" · "), basis: "measured" },
            { label: "Normal range", value: def.normalBand || null, basis: "measured" },
          ]}
        />
        {partners.length > 0 && (
          <Block title="Sensors that usually move with it" basis="measured">
            <Table className="pg-an-table" columns={partnerCols} data={partners} keyExtractor={(p) => p.tag} />
          </Block>
        )}
      </Step>

      <Step n={3} title="Can the reading be trusted?">
        <Facts
          rows={[
            { label: "Trusted", value: `${trust.word}: ${trust.why}`, basis: "inferred" },
            {
              label: "Neighbours",
              value: partners.length
                ? off
                  ? `${moved.length} of ${partners.length} sensors that usually move with it moved too`
                  : `${partners.length - moved.length} of ${partners.length} also as expected`
                : "No other sensor on this machine usually moves with it",
              basis: "measured",
            },
            {
              label: "Operating conditions",
              value: ctx.length ? (ctx.some((c) => c.changed) ? `${ctx.filter((c) => c.changed).map((c) => c.name).join(", ")} moved` : `${ctx.map((c) => c.name).join(", ")} steady`) : null,
              basis: "measured",
            },
          ]}
        />
      </Step>

      <Step n={4} title="Likely causes">
        {causes.length ? <CauseTable causes={causes} /> : <p className="pg-analysis-empty">An on/off signal: only its state and the sensor checks are known.</p>}
      </Step>

      <Step n={5} title="What it affects">
        <Facts
          rows={[
            {
              label: "Problem checks that read it",
              value: reading.length ? (
                <Texts
                  items={reading.map((r) => (
                    <span key={r.id}>
                      {r.plainTitle || r.name}
                      {r.status !== "QUIET" && (
                        <>
                          {" · "}
                          <button type="button" className="pg-diag-inline-link" onClick={() => onInvestigateProblem(r.id)}>
                            happening now, investigate <span aria-hidden="true">→</span>
                          </button>
                        </>
                      )}
                    </span>
                  ))}
                />
              ) : (
                "No problem check reads it"
              ),
              basis: "measured",
            },
            {
              label: "If the reading is wrong",
              value: reading.length && trust.word !== "Yes" ? `${reading.length} check${reading.length === 1 ? "" : "s"} could raise a false alarm or miss a real problem` : null,
              basis: "inferred",
            },
            { label: "Part", value: sub ? `${sub.name}${subHealth !== undefined ? `, health ${Math.round(subHealth)} of 100` : ""}` : null, basis: "measured" },
            {
              label: "Fault library",
              value: lib.primary.length || lib.support.length ? `Main evidence for ${lib.primary.length}, support for ${lib.support.length} of the faults it describes` : null,
              basis: "measured",
              title: [...lib.primary, ...lib.support].map((f) => `${f.id} · ${f.title}`).join("\n"),
            },
          ]}
        />
      </Step>

      <Step n={6} title="How it is developing">
        <Facts
          rows={[
            { label: "Now", value: off ? (change?.beganAgo !== null && change?.beganAgo !== undefined ? `Off expected for ${formatDuration(change.beganAgo)}` : "Off expected") : "Within its normal range", basis: "measured" },
            { label: "Direction", value: change?.progress ?? null, basis: "inferred" },
            { label: "Times it left its range", value: change ? `${change.excursions} in the last ${formatDuration(frame.t - (frame.times[0] ?? frame.t))}` : null, basis: "measured" },
          ]}
        />
      </Step>

      <Step n={7} title="What to do">
        <Facts rows={[{ label: "Do this", value: <Texts items={distinctTexts(todo)} />, basis: "inferred" }]} />
      </Step>

      <Step n={8} title="How to confirm">
        <Facts
          rows={[
            { label: "Compare with", value: partners.length ? <Texts items={partners.map((p) => p.name)} /> : null, basis: "verify" },
            { label: "Take a manual reading", value: def.point ? `With a handheld instrument at the same point (${def.point})` : "With a handheld instrument at the same point", basis: "verify" },
            { label: "Check on site", value: (() => { const c = distinctTexts([...lib.primary, ...lib.support].map((f) => f.check)); return c.length ? <Texts items={c} /> : null; })(), basis: "verify" },
            { label: "Trusted again when", value: trust.word !== "Yes" ? `It passes the sensor checks${partners.length ? " and moves with the sensors above" : ""}` : null, basis: "verify" },
          ]}
        />
      </Step>
    </>
  );
}
