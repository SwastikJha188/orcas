"use client";

/*
 * Machine › Overview — operating-point table and the "status by area" table.
 * Each area row is a one-line digest of a sibling page with a hand-off link;
 * none copies the page it points to.
 */

import React from "react";
import { rowActivate } from "@/components/ui/row-activate";
import { Loading } from "@/components/ui/loading";
import type { AssetMachine } from "./assets-data";
import type { AssetsSubPage } from "./assets-view";
import { Chevron, Section, splitCause } from "./analysis/an-ui";
import { durationText } from "./prognosis/prognosis-derive";
import { severityTone, type Tone } from "./assets-shell-ui";
import { RangeBar } from "./overview-ui";
import { sevLimit, type OverviewDigest } from "./overview-digest";
import { conditionTone, validityTone } from "@/components/ui/status";
import { displayName } from "@/lib/display-name";

export const OV_SECTIONS = {
  machine: "ov-machine",
  operating: "ov-operating",
  areas: "ov-areas",
} as const;

/** sessionStorage key another page sets to open the Operator view's machine Overview at a section id. */
export const OVERVIEW_SECTION_KEY = "ultron.overview.section";

export interface OvSectionProps {
  machine: AssetMachine;
  d: OverviewDigest;
  go: (page: AssetsSubPage) => void;
}

export const fmtNum = (v: number | null, decimals = 1) =>
  v === null || !Number.isFinite(v) ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Status dot + label; colour only when the state is not normal. */
export function StateCell({ tone, label }: { tone: Tone; label: string }) {
  const alert = tone === "warn" || tone === "bad";
  return (
    <span className="pg-ov-state" data-tone={alert ? tone : undefined}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}

/* ================================================================== */
/* Operating point                                                     */
/* ================================================================== */

export function OvOperatingSection({ d }: OvSectionProps) {
  const { operating } = d;
  if (operating.rows.length === 0) {
    // Still loading the machine's record: hold the section's place instead of leaving a gap.
    return d.catalog.isLoading ? (
      <Section id={OV_SECTIONS.operating} title="Running conditions">
        <Loading label="Loading the running conditions…" rows={3} />
      </Section>
    ) : null;
  }
  const live = operating.source === "live";

  return (
    <Section id={OV_SECTIONS.operating} title="Running conditions">
      <div className="pg-ov-flush">
        <table className="pg-ov-table">
          <thead>
            <tr>
              <th scope="col">Reading</th>
              <th scope="col" className="pg-ov-num">Now</th>
              {live && <th scope="col" className="pg-ov-num pg-ov-hide-md">Expected</th>}
              {live && (
                <th scope="col" className="pg-ov-num pg-ov-hide-md" title="How far the reading is from the expected value, in multiples of its usual spread">
                  Off expected
                </th>
              )}
              <th scope="col" className="pg-ov-num pg-ov-hide-sm">Normal range</th>
              <th scope="col" className="pg-ov-hide-sm pg-ov-range-col">
                <span className="pg-ov-sr">Position in range</span>
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {operating.rows.map((r) => {
              const bad = r.quality !== null && r.quality !== "Good";
              const off = r.status !== "Normal";
              return (
                <tr key={r.tag} className="pg-ov-row">
                  <td className="pg-ov-name" title={`${r.name} (tag ${r.tag})`}>
                    {displayName(r.name)}
                  </td>
                  <td className="pg-ov-num ast-num pg-ov-val">
                    {r.value === null ? r.display || "—" : fmtNum(r.value, r.decimals)}
                    <span className="ast-unit">{r.unit}</span>
                    {r.calculated && (
                      <span className="pg-ov-suffix" title="Calculated from other readings, not measured directly">
                        calculated
                      </span>
                    )}
                  </td>
                  {live && (
                    <td
                      className="pg-ov-num ast-num pg-ov-muted pg-ov-hide-md"
                      title={r.setpoint !== null ? "Target the operator has set" : "What the reading should be at this operating state"}
                    >
                      {r.setpoint !== null ? `Target ${fmtNum(r.setpoint, r.decimals)}` : fmtNum(r.model, r.decimals)}
                    </td>
                  )}
                  {live && (
                    <td className="pg-ov-num ast-num pg-ov-hide-md">
                      <span
                        className="pg-ov-dev"
                        data-tone={off && r.z !== null && Math.abs(r.z) >= 3 ? severityTone(r.status) : undefined}
                        title={r.z === null ? undefined : `${Math.abs(r.z).toFixed(1)} times its usual spread ${r.z >= 0 ? "above" : "below"} the expected value`}
                      >
                        {r.z === null ? "—" : `${Math.abs(r.z).toFixed(1)}× ${r.z >= 0 ? "above" : "below"}`}
                      </span>
                    </td>
                  )}
                  <td className="pg-ov-num ast-num pg-ov-muted pg-ov-hide-sm">{r.normalBand || "—"}</td>
                  <td className="pg-ov-hide-sm pg-ov-range-col">
                    <RangeBar row={r} tone={off ? severityTone(r.status) : "idle"} />
                  </td>
                  <td>
                    <StateCell tone={bad ? validityTone(r.quality as string) : severityTone(r.status)} label={bad ? (r.quality as string) : sevLimit(r.status)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ================================================================== */
/* Status by area                                                      */
/* ================================================================== */

interface AreaRow {
  id: string;
  area: string;
  value: React.ReactNode;
  detail: string;
  /** Tooltip for the detail when it differs (IDs behind the names). */
  detailTip?: string;
  tone: Tone;
  state: string;
  page: AssetsSubPage;
  link: string;
}

export function areaRows({ d }: Pick<OvSectionProps, "machine" | "d">): AreaRow[] {
  const rows: AreaRow[] = [];
  const { findings, outlook, ai, dataQuality: q, racks, overall, sortedGroups, groups, counts, sensors } = d;

  if (findings.source !== "none") {
    const top = findings.active[0];
    const svc = findings.service[0];
    const crit = findings.active.some((f) => f.severity === "Critical");
    rows.push({
      id: "findings",
      area: "Problems",
      value: findings.active.length,
      detailTip: top ? [top.engName !== top.name ? top.engName : null, top.id].filter(Boolean).join(" · ") : svc ? svc.id : undefined,
      detail: top
        ? `${top.name}${top.where ? ` · ${top.where}` : ""}${findings.active.length > 1 ? ` · and ${findings.active.length - 1} more` : ""}`
        : findings.pending
          ? `${findings.pending} being confirmed`
          : svc
            ? `No confirmed problem · ${svc.name}${svc.where ? ` (${svc.where})` : ""}`
            : "No confirmed problem",
      tone: crit ? "bad" : findings.active.length ? "warn" : "good",
      state: crit ? "Critical" : findings.active.length ? "Alert" : "Normal",
      page: "diagnosis",
      link: "Diagnosis",
    });
  }

  if (groups.rows.length || d.isLiveHealth) {
    const lowest = groups.rows.reduce<(typeof groups.rows)[number] | null>(
      (min, g) => (!min || (g.status !== "Normal" && min.status === "Normal") || (g.status === min.status && g.health < min.health) ? g : min),
      null,
    );
    const flagged = groups.rows.filter((g) => g.status !== "Normal").length;
    rows.push({
      id: "health",
      area: "Health",
      value: (
        <>
          {overall ?? "—"}
          {overall !== null && <span className="ast-unit">%</span>}
        </>
      ),
      detail: lowest ? `Lowest: ${lowest.name} ${lowest.health} % · ${flagged} of ${groups.rows.length} need attention` : "No part scores yet",
      tone: conditionTone(d.conditionLabel),
      state: d.conditionLabel,
      page: "diagnosis",
      link: "Diagnosis",
    });
  }

  if (outlook?.first && outlook.intervene) {
    const f = outlook.first;
    const c = outlook.crossing;
    rows.push({
      id: "outlook",
      area: "Remaining life",
      value: (
        <>
          {outlook.intervene}
        </>
      ),
      detail: `${f.name}${c ? ` · ${displayName(c.name)} reaches its ${c.level === "alarm" ? "alarm" : "alert"} limit in ${durationText(c.hours)}` : ""}`,
      detailTip: c ? c.tag : undefined,
      tone: severityTone(outlook.condition),
      state: outlook.condition,
      page: "prognosis",
      link: "Prognosis",
    });
  }

  if (ai) {
    const cause = ai.top ? splitCause(ai.top.cause).name : "No problem found";
    const conf = ai.top ? ai.top.confidence : ai.model.confidence;
    rows.push({
      id: "cause",
      area: "Likely cause",
      value: (
        <>
          {conf === null ? "—" : Math.round(conf)}
          {conf !== null && <span className="ast-unit">% sure</span>}
        </>
      ),
      detail: ai.top ? `${cause} · ${ai.top.subsystem}` : cause,
      tone: ai.top ? severityTone(ai.top.severity) : "good",
      state: ai.top ? ai.top.severity : "Normal",
      page: "analysis",
      link: "Analysis",
    });
  }

  if (sensors.length) {
    const off = counts.Alert + counts.Critical;
    const bad = (q.suspect ?? 0) + (q.invalid ?? 0) + (q.held ?? 0);
    rows.push({
      id: "sensors",
      area: "Sensors",
      value:
        q.live && q.total ? (
          <>
            {q.valid}
            <span className="ast-unit">of {q.total} trusted</span>
          </>
        ) : (
          <>
            {sensors.length}
            <span className="ast-unit">linked</span>
          </>
        ),
      detail: [`${off} need attention`, q.live ? `${q.suspect ?? 0} may be wrong · ${q.invalid ?? 0} wrong · ${q.held ?? 0} frozen` : null, `${q.placed} on the drawing`]
        .filter(Boolean)
        .join(" · "),
      tone: counts.Critical ? "bad" : off || bad ? "warn" : "good",
      state: counts.Critical ? "Critical" : off || bad ? "Alert" : "Normal",
      page: "sensors",
      link: "Sensors",
    });
  }

  if (racks.racks.length) {
    const modules = racks.racks.reduce((n, r) => n + r.modules.length, 0);
    const protocols = [...new Set(racks.racks.map((r) => r.protocol).filter(Boolean))];
    rows.push({
      id: "acq",
      area: "Data collection",
      value: (
        <>
          {racks.racks.length}
          <span className="ast-unit">{racks.racks.length === 1 ? "source" : "sources"}</span>
        </>
      ),
      detail: [`${modules} input ${modules === 1 ? "card" : "cards"}`, protocols.slice(0, 3).join(" · ")].filter(Boolean).join(" · "),
      tone: "idle",
      state: "—",
      page: "rack",
      link: "Rack",
    });
  }

  if (d.frame?.defs.hasShell) {
    const shell = d.frame.signals["CAL-KLN-03"];
    if (shell) {
      rows.push({
        id: "thermal",
        area: "Kiln shell heat",
        value: (
          <>
            {shell.display}
            <span className="ast-unit">{d.frame.defs.signalByTag["CAL-KLN-03"]?.unit ?? "°C"} hottest</span>
          </>
        ),
        detail: "Temperature scan of the whole kiln shell (74 m, all the way round)",
        tone: severityTone(shell.status),
        state: sevLimit(shell.status),
        page: "thermal",
        link: "Shell temperature",
      });
    }
  }

  return rows;
}

export function OvAreasSection({ machine, d, go }: OvSectionProps) {
  const rows = areaRows({ machine, d });
  if (rows.length === 0) {
    return d.catalog.isLoading ? (
      <Section id={OV_SECTIONS.areas} title="Status by area">
        <Loading label="Loading the areas…" rows={3} />
      </Section>
    ) : null;
  }

  return (
    <Section id={OV_SECTIONS.areas} title="Status by area">
      <div className="pg-ov-flush">
        <table className="pg-ov-table pg-ov-areas">
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col" className="pg-ov-num">Now</th>
              <th scope="col" className="pg-ov-hide-sm">Details</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="pg-ov-sr">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="pg-ov-row"
                aria-label={`${r.area}: open ${r.link}`}
                {...rowActivate(() => go(r.page))}
              >
                <td className="pg-ov-name">{r.area}</td>
                <td className="pg-ov-num ast-num pg-ov-val">{r.value}</td>
                <td className="pg-ov-muted pg-ov-hide-sm pg-ov-detail" title={r.detailTip ? `${r.detail} (${r.detailTip})` : r.detail}>
                  {r.detail}
                </td>
                <td>{r.state === "—" ? <span className="pg-ov-muted">—</span> : <StateCell tone={r.tone} label={r.state} />}</td>
                <td className="pg-ov-trail">
                  <span className="pg-ov-link">
                    {r.link}
                    <Chevron />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
