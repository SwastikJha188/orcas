"use client";

/**
 * Condition strip: one status-bar row for the plant or one machine — its
 * condition, open alarms, alarms nobody has acknowledged yet, how many sensors
 * are sending data, and how it is running. Three cells open a small panel
 * with the detail behind the number.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { revalidateApi, useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { conditionTone } from "@/components/ui/status";
import { PillButton, PillNav, Skel } from "@/components/ui";
import { StatusTag } from "@/components/assets/assets-shell-ui";
import { CASES_CHANGED_EVENT, CaseApiError, VOCABULARY_URL, casesApi, conditionUrl, type CaseVocabulary, type ConditionStrip as ConditionData } from "./cases-api";
import "./problems.css";

/** Re-reads `url` whenever a case, alarm or request changes anywhere on the page. */
export function useRefreshOnCaseChange(url: string | null): void {
  useEffect(() => {
    if (!url) return;
    const on = () => void revalidateApi(url);
    window.addEventListener(CASES_CHANGED_EVENT, on);
    return () => window.removeEventListener(CASES_CHANGED_EVENT, on);
  }, [url]);
}

/** Running-mode words from the case vocabulary ("stopped" → "Stopped"). */
export function useModeWord(): (mode: string) => string {
  const { data } = useApi<CaseVocabulary>(VOCABULARY_URL);
  return useCallback(
    (mode: string) => data?.modes.find((m) => m.value === mode)?.label ?? (mode ? mode.charAt(0).toUpperCase() + mode.slice(1).replace(/_/g, " ") : "Not known"),
    [data],
  );
}

type Panel = "condition" | "alarms" | "data";
type SeverityFilter = "all" | "Alert" | "Critical";
type SeenFilter = "all" | "open" | "acked";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Caret({ open }: { open: boolean }) {
  return (
    <svg className="prb-caret" data-open={open || undefined} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ConditionStrip({ plantId, machineId, onRecordAlarm }: { plantId: string | null; machineId?: string | null; onRecordAlarm?: () => void }) {
  const url = plantId || machineId ? conditionUrl({ plantId, machineId }) : null;
  const { data, error, isLoading } = useApi<ConditionData>(url, { refreshMs: 30_000 });
  useRefreshOnCaseChange(url);
  const { timeZone } = useSiteTimeZone(machineId ? { machineId } : { nodeId: plantId });
  const modeWord = useModeWord();

  const [panel, setPanel] = useState<Panel | null>(null);
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [seen, setSeen] = useState<SeenFilter>("all");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on a click outside the strip or on Escape.
  useEffect(() => {
    if (!panel) return;
    const down = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPanel(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [panel]);

  const toggle = (p: Panel) => {
    setAckError(null);
    setPanel((cur) => (cur === p ? null : p));
  };

  const alarms = useMemo(() => data?.alarms ?? [], [data]);
  const notAcked = alarms.filter((a) => !a.ackedAt).length;
  const shown = alarms.filter((a) => (severity === "all" || a.severity === severity) && (seen === "all" || (seen === "open" ? !a.ackedAt : Boolean(a.ackedAt))));
  const time = (t: string | null) => formatLocalTime(t, { date: true, seconds: false, timeZone });

  const acknowledge = async (kind: "system" | "manual", id: number, key: string) => {
    setBusyKey(key);
    setAckError(null);
    try {
      await casesApi.acknowledge(kind, id);
      if (url) await revalidateApi(url);
    } catch (e) {
      setAckError(e instanceof CaseApiError ? e.message : "Could not reach the server. Try again.");
    } finally {
      setBusyKey(null);
    }
  };

  // Until the first answer, each value shows a placeholder (an error shows "Not available").
  const wait = error ? "Not available" : <Skel width="4ch" label="Loading" />;
  const running = data?.running ?? [];
  const runningText = (() => {
    if (!data) return wait;
    if (running.length === 0) return "Not recorded";
    if (running.length === 1) return modeWord(running[0].mode);
    const byMode = new Map<string, number>();
    for (const r of running) byMode.set(modeWord(r.mode), (byMode.get(modeWord(r.mode)) ?? 0) + 1);
    return [...byMode.entries()].map(([m, n]) => `${n} ${m.toLowerCase()}`).join(" · ");
  })();
  const runningTitle = running.map((r) => `${r.machineName}: ${modeWord(r.mode)} since ${time(r.since)}`).join("\n") || undefined;

  const staleMin = data ? Math.max(1, Math.round(data.data.staleAfterS / 60)) : 3;
  const word = data?.condition.word ?? "No data";

  if (!url) return null;

  return (
    <div className="prb-strip" ref={rootRef} role="group" aria-label="Condition now">
      {/* Scope */}
      <div className="prb-cell">
        <span className="prb-cell-label">Showing</span>
        <span className="prb-cell-value">{data?.scope ?? (isLoading ? <Skel width="10ch" label="Loading" /> : "—")}</span>
      </div>

      {/* Machine condition */}
      <div className="prb-cell prb-cell-pop">
        <button type="button" className="prb-cell-btn" aria-expanded={panel === "condition"} aria-haspopup="dialog" onClick={() => toggle("condition")} disabled={!data}>
          <span className="prb-cell-label">
            Machine condition <Caret open={panel === "condition"} />
          </span>
          <span className="prb-cell-value">{data ? <StatusTag tone={conditionTone(word)} label={word} /> : wait}</span>
        </button>
        {panel === "condition" && data && (
          <div className="prb-pop" role="dialog" aria-label="How the condition is decided">
            <div className="prb-pop-head">
              <span className="prb-pop-title">How the condition is decided</span>
              <StatusTag tone={conditionTone(word)} label={word} />
            </div>
            <p className="prb-pop-text">{data.condition.basis}</p>
            <p className="prb-pop-note">Normal: nothing needs a look. Alert: something is wrong and needs a look soon. Critical: act now.</p>
          </div>
        )}
      </div>

      {/* Open alarms */}
      <div className="prb-cell prb-cell-pop">
        <button type="button" className="prb-cell-btn" aria-expanded={panel === "alarms"} aria-haspopup="dialog" onClick={() => toggle("alarms")} disabled={!data}>
          <span className="prb-cell-label">
            Open alarms <Caret open={panel === "alarms"} />
          </span>
          <span className="prb-cell-value" data-tone={alarms.some((a) => a.severity === "Critical") ? "bad" : alarms.length ? "warn" : undefined}>
            {data ? alarms.length : wait}
          </span>
        </button>
        {panel === "alarms" && data && (
          <div className="prb-pop prb-pop-wide" role="dialog" aria-label="Open alarms">
            <div className="prb-pop-head">
              <span className="prb-pop-title">{alarms.length ? `${plural(alarms.length, "open alarm", "open alarms")} · ${notAcked} not acknowledged` : "No open alarms"}</span>
              {onRecordAlarm && (
                <button
                  type="button"
                  className="prb-link-btn"
                  onClick={() => {
                    setPanel(null);
                    onRecordAlarm();
                  }}
                >
                  Record an alarm seen on site
                </button>
              )}
            </div>
            <div className="prb-pop-filters">
              <PillNav<SeverityFilter>
                ariaLabel="How serious"
                items={[
                  { id: "all", label: "All" },
                  { id: "Alert", label: "Alert" },
                  { id: "Critical", label: "Critical" },
                ]}
                activeId={severity}
                onChange={setSeverity}
              />
              <PillNav<SeenFilter>
                ariaLabel="Seen by someone"
                items={[
                  { id: "all", label: "All" },
                  { id: "open", label: "Not acknowledged" },
                  { id: "acked", label: "Acknowledged" },
                ]}
                activeId={seen}
                onChange={setSeen}
              />
            </div>
            <p className="prb-pop-note">Acknowledging does not clear an alarm; it shows someone has seen it.</p>
            {ackError && (
              <p className="pg-note" data-tone="bad" role="alert">
                {ackError}
              </p>
            )}
            <div className="prb-pop-scroll">
              {shown.length ? (
                <table className="prb-mini-table">
                  <thead>
                    <tr>
                      <th>How serious</th>
                      <th>What</th>
                      <th>Machine</th>
                      <th>Where</th>
                      <th>Since</th>
                      <th>Source</th>
                      <th>Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((a) => (
                      <tr key={a.key}>
                        <td>
                          <StatusTag tone={a.severity === "Critical" ? "bad" : "warn"} label={a.severity} />
                        </td>
                        <td className="prb-wrap">{a.title}</td>
                        <td>{a.machineName}</td>
                        <td className="prb-wrap">{a.where ?? <span className="ast-muted">Not given</span>}</td>
                        <td className="prb-nowrap">{time(a.since)}</td>
                        <td className="prb-wrap prb-muted-cell">{a.source}</td>
                        <td className="prb-nowrap">
                          {a.ackedAt ? (
                            <span className="ast-muted">
                              {a.ackedBy ? `${a.ackedBy}, ` : ""}
                              {time(a.ackedAt)}
                            </span>
                          ) : (
                            <PillButton variant="secondary" loading={busyKey === a.key} onClick={() => void acknowledge(a.kind, a.id, a.key)}>
                              Acknowledge
                            </PillButton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="prb-pop-empty">{alarms.length ? "No alarms match these filters." : "Nothing has crossed a limit or matched a known problem."}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Not acknowledged */}
      <div className="prb-cell">
        <span className="prb-cell-label">Not acknowledged</span>
        <span className="prb-cell-value" data-tone={notAcked ? "warn" : undefined}>
          {data ? notAcked : wait}
        </span>
      </div>

      {/* Data coming in */}
      <div className="prb-cell prb-cell-pop">
        <button type="button" className="prb-cell-btn" aria-expanded={panel === "data"} aria-haspopup="dialog" onClick={() => toggle("data")} disabled={!data}>
          <span className="prb-cell-label">
            Data coming in <Caret open={panel === "data"} />
          </span>
          <span className="prb-cell-value" data-tone={data && data.data.fresh < data.data.total ? "warn" : undefined}>
            {data ? `${data.data.fresh} of ${plural(data.data.total, "sensor", "sensors")}` : wait}
          </span>
        </button>
        {panel === "data" && data && (
          <div className="prb-pop prb-pop-wide prb-pop-end" role="dialog" aria-label="Sensors sending data">
            <div className="prb-pop-head">
              <span className="prb-pop-title">
                {data.data.fresh} of {plural(data.data.total, "sensor has", "sensors have")} sent a reading in the last {plural(staleMin, "minute", "minutes")}
              </span>
            </div>
            <div className="prb-pop-scroll">
              {data.data.rows.length ? (
                <table className="prb-mini-table">
                  <thead>
                    <tr>
                      <th>Machine</th>
                      <th>Sensor</th>
                      <th>Last reading</th>
                      <th>Recent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.rows.map((r, i) => (
                      <tr key={`${r.machineName}-${r.name}-${i}`}>
                        <td>{r.machineName}</td>
                        <td className="prb-wrap">{r.name}</td>
                        <td className="prb-nowrap">{r.at ? time(r.at) : <span className="ast-muted">None in the last day</span>}</td>
                        <td>
                          <StatusTag tone={r.fresh ? "good" : "warn"} label={r.fresh ? "Yes" : `No, older than ${plural(staleMin, "minute", "minutes")}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="prb-pop-empty">No sensors are wired to send readings here.</p>
              )}
            </div>
            {data.data.rows.length < data.data.total && <p className="prb-pop-note">Showing the first {data.data.rows.length} sensors.</p>}
          </div>
        )}
      </div>

      {/* Running */}
      <div className="prb-cell" title={runningTitle}>
        <span className="prb-cell-label">Running</span>
        <span className="prb-cell-value">{runningText}</span>
      </div>
    </div>
  );
}
