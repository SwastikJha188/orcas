"use client";

import React from "react";

/* ==========================================================================
   Pretty-printed JSON whose keys and array items are buttons: clicking one
   hands its path (keys and indices from the payload root) to the editor.
   ========================================================================== */

export type JsonPath = (string | number)[];

const ARRAY_PREVIEW = 25;

export function JsonView({ value, onPick, pickLabel }: { value: unknown; onPick?: (path: JsonPath) => void; pickLabel?: string }) {
  return (
    <pre className="fmt-json" aria-label="Payload">
      <Node value={value} path={[]} indent={0} onPick={onPick} pickLabel={pickLabel} />
    </pre>
  );
}

function pad(n: number) {
  return "  ".repeat(n);
}

function Scalar({ value }: { value: unknown }) {
  if (value === null) return <span className="fmt-json-null">null</span>;
  if (typeof value === "string") return <span className="fmt-json-str">{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <span className="fmt-json-num">{String(value)}</span>;
  if (typeof value === "boolean") return <span className="fmt-json-bool">{String(value)}</span>;
  return <span>{String(value)}</span>;
}

function Key({ label, path, onPick, pickLabel }: { label: string; path: JsonPath; onPick?: (p: JsonPath) => void; pickLabel?: string }) {
  if (!onPick) return <span className="fmt-json-key">{label}</span>;
  return (
    <button type="button" className="fmt-json-key fmt-json-pick" onClick={() => onPick(path)} aria-label={`Use ${label}${pickLabel ? ` for ${pickLabel}` : ""}`}>
      {label}
    </button>
  );
}

function Node({
  value,
  path,
  indent,
  onPick,
  pickLabel,
}: {
  value: unknown;
  path: JsonPath;
  indent: number;
  onPick?: (p: JsonPath) => void;
  pickLabel?: string;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <>[]</>;
    const shown = value.slice(0, ARRAY_PREVIEW);
    return (
      <>
        {"[\n"}
        {shown.map((v, i) => (
          <React.Fragment key={i}>
            {pad(indent + 1)}
            <Key label={`[${i}]`} path={[...path, i]} onPick={onPick} pickLabel={pickLabel} />{" "}
            <Node value={v} path={[...path, i]} indent={indent + 1} onPick={onPick} pickLabel={pickLabel} />
            {i < value.length - 1 ? ",\n" : "\n"}
          </React.Fragment>
        ))}
        {value.length > shown.length && <span className="fmt-json-more">{`${pad(indent + 1)}… ${value.length - shown.length} more\n`}</span>}
        {pad(indent)}]
      </>
    );
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <>{"{}"}</>;
    return (
      <>
        {"{\n"}
        {entries.map(([k, v], i) => (
          <React.Fragment key={k}>
            {pad(indent + 1)}
            <Key label={JSON.stringify(k)} path={[...path, k]} onPick={onPick} pickLabel={pickLabel} />
            {": "}
            <Node value={v} path={[...path, k]} indent={indent + 1} onPick={onPick} pickLabel={pickLabel} />
            {i < entries.length - 1 ? ",\n" : "\n"}
          </React.Fragment>
        ))}
        {pad(indent)}
        {"}"}
      </>
    );
  }
  return <Scalar value={value} />;
}
