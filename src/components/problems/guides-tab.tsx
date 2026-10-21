"use client";

/**
 * Investigation guides: written starting points for a known kind of problem on
 * a machine — the readings to look at, the checks to do, and the usual causes.
 * They are not problems the system has found.
 */
import React, { useMemo, useState } from "react";
import { useApi } from "@/lib/api-cache";
import { PillButton, PillNav, Loading } from "@/components/ui";
import { guidesUrl, type Guide } from "./cases-api";
import { useRefreshOnCaseChange } from "./condition-strip";
import type { NewCasePreset } from "./new-case-dialog";
import "./problems.css";

function GuideList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="prb-guide-col">
      <h4 className="prb-guide-col-title">{title}</h4>
      {items.length ? (
        <ul className="prb-guide-list">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className="ast-muted prb-guide-none">None written yet.</p>
      )}
    </div>
  );
}

export function GuidesTab({ plantId, onStartCase }: { plantId: string | null; onStartCase: (preset: NewCasePreset) => void }) {
  const url = plantId ? guidesUrl({ plantId }) : null;
  const { data, error, isLoading } = useApi<Guide[]>(url);
  useRefreshOnCaseChange(url);
  const [machine, setMachine] = useState<string>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const guides = useMemo(() => data ?? [], [data]);
  const machineChips = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    for (const g of guides) m.set(g.machineId, { name: g.machineName, n: (m.get(g.machineId)?.n ?? 0) + 1 });
    return [...m.entries()].map(([id, v]) => ({ id, ...v }));
  }, [guides]);
  const shown = machine === "all" ? guides : guides.filter((g) => g.machineId === machine);

  const toggle = (id: string) =>
    setOpenIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="prb-tab">
      <div className="prb-toolbar">
        <p className="prb-intro">Starting points for an investigation — not problems the system has found.</p>
        {machineChips.length > 1 && (
          <PillNav
            ariaLabel="Machine"
            items={[{ id: "all", label: `All machines (${guides.length})` }, ...machineChips.map((m) => ({ id: m.id, label: `${m.name} (${m.n})` }))]}
            activeId={machine}
            onChange={setMachine}
          />
        )}
      </div>

      {isLoading && !data && <Loading label="Loading the investigation guides…" rows={5} />}
      {error && !data && (
        <p className="pg-note" data-tone="bad" role="alert">
          Could not load the investigation guides. Reload the page to try again.
        </p>
      )}
      {data && guides.length === 0 && <p className="prb-empty">No investigation guides are written for the machines in this plant yet.</p>}

      <div className="prb-list">
        {shown.map((g) => {
          const isOpen = openIds.has(g.id);
          return (
            <article key={g.id} className="ast-card prb-guide">
              <div className="prb-guide-main">
                <span className="prb-where">
                  {g.machineName}
                  {g.partName ? ` · ${g.partName}` : " · Whole machine"}
                </span>
                <h3 className="prb-case-title">{g.title}</h3>
                <p className="prb-guide-symptom">{g.symptom}</p>
                <button type="button" className="prb-disclose" aria-expanded={isOpen} onClick={() => toggle(g.id)}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                  What to look at and check
                </button>
                {isOpen && (
                  <div className="prb-guide-cols">
                    <GuideList title="Readings to look at" items={g.readings} />
                    <GuideList title="Checks to do" items={g.checks} />
                    <GuideList title="Possible causes" items={g.causes} />
                  </div>
                )}
              </div>
              <div className="prb-guide-side">
                <PillButton variant="secondary" onClick={() => onStartCase({ machineId: g.machineId, partId: g.partId, title: g.title, guideId: g.id })}>
                  Start a case from this
                </PillButton>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
