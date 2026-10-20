"use client";

/**
 * "How the readings moved": one reading of the case (its last 24 hours) or a
 * series imported from a file, drawn as a plain SVG line with hover. Shared by
 * the Diagnosis and Prognosis tabs. Also the import-from-file dialog.
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dialog, Field, FieldGrid, PillButton, PillNav, Select, TextArea, TextInput } from "@/components/ui";
import { formatLocalTime } from "@/lib/time";
import { casesApi } from "./cases-api";
import { CaseCard, ErrorNote, num, useCase, useSave } from "./case-shared";

type Range = "6h" | "24h" | "all";
const RANGE_MS: Record<Range, number> = { "6h": 6 * 3_600_000, "24h": 24 * 3_600_000, all: Infinity };
const RANGES: Array<{ id: Range; label: string }> = [
  { id: "6h", label: "6 h" },
  { id: "24h", label: "24 h" },
  { id: "all", label: "All" },
];

interface Pt {
  t: number;
  v: number | null;
}

/** Thins a long series to about `n` points (bucket means; an all-empty bucket stays a gap). */
function thin(pts: Pt[], n: number): Pt[] {
  if (pts.length <= n) return pts;
  const size = pts.length / n;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const bucket = pts.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    if (!bucket.length) continue;
    const vals = bucket.filter((p) => p.v !== null).map((p) => p.v as number);
    out.push({ t: bucket[Math.floor(bucket.length / 2)].t, v: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null });
  }
  return out;
}

export function ReadingChart({ idPrefix }: { idPrefix: string }) {
  const { c, timeZone } = useCase();
  const [pick, setPick] = useState<string>("");
  const [range, setRange] = useState<Range>("24h");
  const [importing, setImporting] = useState(false);

  const options = useMemo(
    () => [
      ...c.readings.map((r) => ({ value: `m:${r.measurementId}`, label: r.name })),
      ...c.series.map((s) => ({ value: `s:${s.id}`, label: `${s.name} (from file)` })),
    ],
    [c.readings, c.series],
  );
  const current = options.some((o) => o.value === pick) ? pick : (options[0]?.value ?? "");

  const picked = useMemo(() => {
    if (current.startsWith("m:")) {
      const r = c.readings.find((x) => `m:${x.measurementId}` === current);
      return r ? { name: r.name, unit: r.unit, expected: r.expected, pts: r.history.map((p) => ({ t: Date.parse(p.t), v: p.v })) } : null;
    }
    const s = c.series.find((x) => `s:${x.id}` === current);
    return s ? { name: s.name, unit: s.unit, expected: null, pts: s.points.map((p) => ({ t: Date.parse(p.t), v: p.v })) } : null;
  }, [current, c.readings, c.series]);

  const pts = useMemo(() => {
    if (!picked || !picked.pts.length) return [];
    const end = picked.pts[picked.pts.length - 1].t;
    return picked.pts.filter((p) => p.t >= end - RANGE_MS[range]);
  }, [picked, range]);

  return (
    <CaseCard
      title="How the readings moved"
      id={`${idPrefix}-chart`}
      className="case-wide"
      actions={
        <PillButton variant="secondary" onClick={() => setImporting(true)}>
          Import readings from a file
        </PillButton>
      }
    >
      {options.length ? (
        <>
          <div className="case-chart-bar">
            <span className="case-chart-pick">
              <Select id={`${idPrefix}-chart-pick`} value={current} onChange={setPick} options={options} />
            </span>
            <PillNav items={RANGES} activeId={range} onChange={setRange} ariaLabel="Time range" />
          </div>
          {picked && pts.filter((p) => p.v !== null).length >= 2 ? (
            <LineChart pts={pts} unit={picked.unit} expected={picked.expected} label={picked.name} timeZone={timeZone} />
          ) : (
            <p className="ast-muted case-empty">No readings for this time range.</p>
          )}
        </>
      ) : (
        <p className="ast-muted case-empty">This case has no readings yet. Import readings from a file to see them here.</p>
      )}
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onDone={(id) => {
            setPick(`s:${id}`);
            setRange("all");
            setImporting(false);
          }}
        />
      )}
    </CaseCard>
  );
}

const H = 220;
const PAD = { l: 52, r: 12, t: 12, b: 26 };

function LineChart({ pts: raw, unit, expected, label, timeZone }: { pts: Pt[]; unit: string; expected: number | null; label: string; timeZone: string | undefined }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(200, el.offsetWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const pts = thin(raw, Math.max(50, Math.round((w - PAD.l - PAD.r) / 2)));
    const vals = pts.filter((p) => p.v !== null).map((p) => p.v as number);
    if (expected !== null) vals.push(expected);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (hi === lo) {
      hi += Math.abs(hi) * 0.05 || 1;
      lo -= Math.abs(lo) * 0.05 || 1;
    }
    const padV = (hi - lo) * 0.08;
    lo -= padV;
    hi += padV;
    const t0 = pts[0].t;
    const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
    const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * (w - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    let d = "";
    let pen = false;
    for (const p of pts) {
      if (p.v === null) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)} `;
      pen = true;
    }
    const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
    const times = [t0, (t0 + t1) / 2, t1];
    const long = t1 - t0 > 20 * 3_600_000;
    return { pts, x, y, d, ticks, times, long };
  }, [raw, w, expected]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * w;
    let best: number | null = null;
    let bestD = Infinity;
    geo.pts.forEach((p, i) => {
      if (p.v === null) return;
      const dd = Math.abs(geo.x(p.t) - px);
      if (dd < bestD) {
        bestD = dd;
        best = i;
      }
    });
    setHover(best);
  };

  const hp = hover !== null ? geo.pts[hover] : null;
  const hx = hp ? geo.x(hp.t) : 0;
  const hy = hp && hp.v !== null ? geo.y(hp.v) : 0;
  const tip = hp && hp.v !== null ? `${formatLocalTime(hp.t, { date: true, seconds: false, timeZone })} · ${num(hp.v)}${unit ? ` ${unit}` : ""}` : "";
  const tipW = tip.length * 6.4 + 16;
  const tipX = Math.min(Math.max(hx - tipW / 2, PAD.l), w - PAD.r - tipW);

  return (
    <div className="case-chart" ref={ref}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`${label} over time`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {geo.ticks.map((v, i) => (
          <g key={i}>
            <line className="case-chart-grid" x1={PAD.l} x2={w - PAD.r} y1={geo.y(v)} y2={geo.y(v)} />
            <text className="case-chart-axis" x={PAD.l - 6} y={geo.y(v) + 3} textAnchor="end">
              {num(v)}
            </text>
          </g>
        ))}
        {geo.times.map((t, i) => (
          <text key={i} className="case-chart-axis" x={geo.x(t)} y={H - 8} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}>
            {formatLocalTime(t, { date: geo.long, seconds: false, timeZone })}
          </text>
        ))}
        {expected !== null && (
          <g>
            <line className="case-chart-normal" x1={PAD.l} x2={w - PAD.r} y1={geo.y(expected)} y2={geo.y(expected)} />
            <text className="case-chart-axis" x={w - PAD.r - 4} y={geo.y(expected) - 4} textAnchor="end">
              Normal {num(expected)}
              {unit ? ` ${unit}` : ""}
            </text>
          </g>
        )}
        <path className="case-chart-line" d={geo.d} />
        {hp && hp.v !== null && (
          <g>
            <line className="case-chart-cursor" x1={hx} x2={hx} y1={PAD.t} y2={H - PAD.b} />
            <circle className="case-chart-dot" cx={hx} cy={hy} r={3.5} />
            <rect className="case-chart-tip" x={tipX} y={PAD.t} width={tipW} height={20} rx={6} />
            <text className="case-chart-tip-text" x={tipX + 8} y={PAD.t + 14}>
              {tip}
            </text>
          </g>
        )}
      </svg>
      <span className="case-chart-unit">{unit ? `${label} (${unit})` : label}</span>
    </div>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: (seriesId: number) => void }) {
  const { c } = useCase();
  const save = useSave();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [csv, setCsv] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const readFile = (f: File | undefined) => {
    if (!f) return;
    if (!name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
    f.text()
      .then(setCsv)
      .catch(() => save.setError("Could not read that file."));
  };

  const submit = async () => {
    if (!name.trim()) return save.setError("Give the reading a name.");
    if (!csv.trim()) return save.setError("Paste the readings or pick a file.");
    const made: { id: number | null } = { id: null };
    const before = new Set(c.series.map((s) => s.id));
    const ok = await save.run(async () => {
      const r = await casesApi.importSeries(c.id, { name: name.trim(), unit: unit.trim(), csv });
      made.id = r.series.find((s) => !before.has(s.id))?.id ?? r.series.at(-1)?.id ?? null;
    });
    if (ok && made.id !== null) onDone(made.id);
    else if (ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Import readings from a file"
      subtitle={c.title}
      width={620}
      busy={save.busy}
      onSubmit={() => void submit()}
      footerStart={<ErrorNote error={save.error} />}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={save.busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={save.busy}>
            Import
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Reading name" required>
          {(id) => <TextInput id={id} value={name} onChange={setName} placeholder="For example: Drive end vibration (handheld)" />}
        </Field>
        <Field label="Unit">
          {(id) => <TextInput id={id} value={unit} onChange={setUnit} placeholder="For example: mm/s" />}
        </Field>
        <Field
          label="Readings"
          required
          wide
          hint="First line: timestamp,value,quality. Times need a time zone, for example 2026-10-19T08:00:00Z. Quality is valid, missing or invalid. At most 5,000 rows."
        >
          {(id, d) => <TextArea id={id} describedBy={d} value={csv} onChange={setCsv} rows={8} mono placeholder={"timestamp,value,quality\n2026-10-19T08:00:00Z,3.8,valid"} />}
        </Field>
      </FieldGrid>
      <div className="case-file-pick">
        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => readFile(e.target.files?.[0])} />
        <PillButton variant="secondary" onClick={() => fileRef.current?.click()} disabled={save.busy}>
          Pick a file
        </PillButton>
      </div>
    </Dialog>
  );
}
