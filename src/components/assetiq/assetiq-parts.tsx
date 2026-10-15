"use client";

import React from "react";
import { PillButton } from "@/components/ui";
import "./assetiq-ai.css";

/* Small building blocks shared by the three AssetIQ tabs. */

export function EmptyCard({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="ast-card">
      <div className="ast-empty">
        <strong>{title}</strong>
        {children}
      </div>
    </section>
  );
}

export interface CrossLink {
  label: string;
  onClick: () => void;
}

/** "Go next" row at the foot of a tab: every link is a real navigation. */
export function CrossLinks({ links }: { links: CrossLink[] }) {
  if (links.length === 0) return null;
  return (
    <nav className="aiq-links" aria-label="Related pages">
      <span className="ast-caption">Related</span>
      {links.map((l) => (
        <PillButton key={l.label} variant="secondary" onClick={l.onClick}>
          {l.label}
        </PillButton>
      ))}
    </nav>
  );
}
