"use client";

import React from "react";
import type { CatalogSensorView } from "./use-machine-catalog";
import "./rack-calculated.css";

/**
 * Sensors the DB maps to the gateway's analytics core (mapped_signals.source
 * "Calculated"): values the edge gateway computes from other channels, so they
 * have no card or wiring. Listed with the hardware so the Rack tab accounts
 * for every sensor the other pages show.
 */
export function GatewayCalculated({ sensors }: { sensors: CatalogSensorView[] }) {
  if (sensors.length === 0) return null;
  return (
    <section className="ast-card rcal-card" aria-label="Calculated on the gateway">
      <div className="rcal-head">
        <h3 className="rcal-title">
          Calculated on the gateway <span className="ast-num">{sensors.length}</span>
        </h3>
        <span className="rcal-caption">{sensors[0].cardId || "Analytics core"} · computed from other channels, no wiring</span>
      </div>
      <ul className="rcal-list">
        {sensors.map((s) => (
          <li key={s.tag} className="rcal-row" data-tone={s.status === "Critical" ? "bad" : s.status === "Advisory" ? "warn" : "good"}>
            <span className="rcal-dot" aria-hidden="true" />
            <span className="rcal-tag ast-num">{s.tag}</span>
            <span className="rcal-name">{s.name}</span>
            <span className="rcal-value ast-num">
              {s.value} <small>{s.unit}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The catalog's calculated sensors (no hardware channel). */
export function calculatedSensors(sensors: CatalogSensorView[]): CatalogSensorView[] {
  return sensors.filter((s) => /calculated/i.test(s.source) || /^ANALYTICS/i.test(s.cardId));
}
