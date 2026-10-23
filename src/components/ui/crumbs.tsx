"use client";

import React from "react";
import "./form.css";

export interface Crumb {
  label: string;
  /** Goes back up to this level; the last crumb (where you are) never has one. */
  onClick?: () => void;
}

/** Where you are: "SAP / Overview / Clinker Cooler CLR-01". Earlier levels are buttons back up. */
export function Crumbs({ items, label = "Location" }: { items: Crumb[]; label?: string }) {
  return (
    <nav aria-label={label}>
      <ol className="ui-crumbs">
        {items.map((c, i) => (
          <li key={`${i}-${c.label}`}>
            {i === items.length - 1 ? (
              <span aria-current="page">{c.label}</span>
            ) : c.onClick ? (
              <button type="button" className="ui-crumb" onClick={c.onClick}>
                {c.label}
              </button>
            ) : (
              <span>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
