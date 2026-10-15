"use client";

import React from "react";
import { LedgerPointer, useMachineLedger, type Ledger as MachineLedger } from "../analysis/an-quality";

/* Prediction accuracy on Prognosis: the same compact summary Analysis shows,
   read from the one shared ledger, with a link to AssetIQ · Accuracy (the
   home of the ledger, calibration and per-event detail). */

export type Ledger = MachineLedger;

/** The machine's prediction ledger (shared with Analysis and AssetIQ). */
export const useLedger = useMachineLedger;

export function ProgAccuracy({ ledger }: { ledger: Ledger }) {
  return <LedgerPointer ledger={ledger} />;
}
