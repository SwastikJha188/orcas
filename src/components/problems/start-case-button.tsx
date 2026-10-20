"use client";

/**
 * "Start a case" from a problem the system found (Analysis, Diagnosis): opens
 * the problem's open case when there is one, otherwise starts a case filled in
 * from the problem (its plain title and what is happening) and opens it on the
 * Problems page.
 */
import React, { useState } from "react";
import { PillButton } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useApi } from "@/lib/api-cache";
import { casesApi, casesUrl, openCase, type CaseList } from "./cases-api";

export function StartCaseButton({
  machineId,
  partId,
  ruleCode,
  title,
  observation,
  className,
}: {
  machineId: string;
  partId?: string | null;
  ruleCode?: string | null;
  title: string;
  observation: string;
  className?: string;
}) {
  const { setActiveTab, currentUserId } = useIndustrialData();
  const { data } = useApi<CaseList>(ruleCode ? casesUrl({ machineId, ruleCode }) : null);
  const open = data?.cases.find((c) => c.stage !== "closed") ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (open) {
      openCase(open.id, setActiveTab);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await casesApi.create({ machineId, partId: partId ?? null, ruleCode: ruleCode ?? null, title, observation, ownerUserId: currentUserId, runningMode: "running" });
      openCase(id, setActiveTab);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the case");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className={className} title={open ? `Case ${open.id}: ${open.stageWord}` : "Follow this problem as a case: owner, checks, maintenance, and a checked fix"}>
      <PillButton variant="secondary" className="pg-diag-sm" loading={busy} onClick={() => void go()}>
        {open ? `Open its case (${open.stageWord.toLowerCase()}) →` : "Start a case →"}
      </PillButton>
      {error && (
        <span className="pg-note" data-tone="bad" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
