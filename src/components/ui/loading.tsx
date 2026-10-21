"use client";

import "./loading.css";

/**
 * The one loading look: a short plain label over a thin scanning bar (as
 * AssetIQ while it works). Shown until a section's first data arrives, so a
 * slow connection never reads as "nothing here". `rows` adds placeholder
 * lines shaped like the table or list that will appear.
 */
export function Loading({ label = "Loading…", rows = 0, inline = false }: { label?: string; rows?: number; inline?: boolean }) {
  return (
    <div className="ui-loading" data-inline={inline || undefined} role="status" aria-live="polite">
      <span className="ui-loading-label">{label}</span>
      <span className="ui-loading-scan" aria-hidden="true" />
      {rows > 0 && (
        <span className="ui-loading-rows" aria-hidden="true">
          {Array.from({ length: rows }, (_, i) => (
            <span key={i} className="ui-skel" style={{ inlineSize: `${92 - ((i * 17) % 30)}%` }} />
          ))}
        </span>
      )}
    </div>
  );
}

/** A grey block in place of one value (a KPI number) until it loads. */
export function Skel({ width = "3ch", label = "Loading" }: { width?: string; label?: string }) {
  return <span className="ui-skel ui-skel-value" style={{ inlineSize: width }} role="img" aria-label={label} />;
}
