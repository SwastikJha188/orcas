"use client";

/**
 * Value block of a point on an operator mimic, read like a control-room
 * display: [run state] SHORT LABEL  value unit  SP set-point.
 * The label says where the point sits (hmiLabel), the unit what it measures;
 * the run glyph sits on a drive's feedback point (filled running, hollow
 * stopped, red tripped); colour only marks an abnormal value.
 */
import React from "react";
import { MX } from "@/components/assets/machine-kit/machine-kit";
import { textWidth } from "@/components/assets/pyro/line-sheets/text-width";
import type { Tone } from "@/components/assets/assets-shell-ui";

export type RunState = "run" | "stopped" | "tripped";

export interface PillContent {
  label: string;
  value: string;
  sp: string | null;
  run: RunState | null;
  /** A discrete state (Running, Level OK) rather than a measured number: read as a word, not a figure. */
  state?: boolean;
}

/** "LEVEL OK" → "Level OK", "RUNNING" → "Running": state words in sentence case; mixed-case text is left alone. */
export function stateWords(text: string): string {
  if (text !== text.toUpperCase() || !/[A-Z]/.test(text)) return text;
  return text
    .split(/(\s+)/)
    .map((w, i) => (/^(OK|SP|PV)$/.test(w) ? w : i === 0 ? w.charAt(0) + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join("");
}

const LABEL_SCALE = 0.8;

function metrics(p: PillContent, fontSz: number) {
  const labelSz = fontSz * LABEL_SCALE;
  const gap = fontSz * 0.42;
  const glyph = p.run ? fontSz * 0.62 + gap : 0;
  const label = p.label ? textWidth(p.label, labelSz, 600, 0.04) + gap : 0;
  const value = textWidth(p.value, fontSz, p.state ? 500 : 700, 0.01);
  const sp = p.sp ? gap + textWidth(`SP ${p.sp}`, labelSz, 600, 0.02) : 0;
  return { labelSz, gap, glyph, label, value, sp, inner: glyph + label + value + sp };
}

/** Text width of a pill's content (add the side padding). */
export function pillContentWidth(p: PillContent, fontSz: number): number {
  return Math.ceil(metrics(p, fontSz).inner);
}

export function ValuePill({
  content,
  cx,
  cy,
  w,
  h,
  rx,
  fontSz,
  textDy,
  tone,
  hot,
  strokeW,
  frame,
}: {
  content: PillContent;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rx: number;
  fontSz: number;
  textDy: number;
  tone: Tone;
  hot: boolean;
  strokeW: number;
  /** Plate drawn wider than the text (an embedded block that also holds its pad): left edge and width. */
  frame?: { x: number; w: number };
}) {
  const m = metrics(content, fontSz);
  const abnormal = tone === "bad" || tone === "warn";
  const toneColor = tone === "bad" ? MX.bad : MX.warn;
  const stroke = abnormal ? toneColor : hot ? "var(--dx-ink)" : MX.fine;
  const valueFill = abnormal ? toneColor : "var(--dx-ink)";
  // Only an abnormal plate is tinted and rimmed heavier: one kind of thing stands out on the sheet.
  const panel = abnormal ? `color-mix(in srgb, ${toneColor} 12%, ${MX.padPanel})` : MX.padPanel;
  // A Normal reading is plain text: no box, a thin halo in the panel colour keeps it legible over the
  // drawing's lines. However many readings a sheet has, the eye meets boxes only where something is wrong
  // (Von Restorff); hovering or selecting a reading boxes it so you can see which one you are on.
  const boxed = abnormal || hot;
  let x = cx - m.inner / 2;
  const glyphR = fontSz * 0.31;
  const glyphX = x + glyphR;
  if (content.run) x += m.glyph;
  const labelX = x;
  x += m.label;
  const valueX = x;
  x += m.value + m.gap;
  const spX = x;
  return (
    <g>
      {boxed && (
        <rect
          x={frame ? frame.x : cx - w / 2}
          y={cy - h / 2}
          width={frame ? frame.w : w}
          height={h}
          rx={rx}
          style={{ fill: panel }}
          stroke={stroke}
          strokeWidth={abnormal ? strokeW * 1.6 : strokeW}
        />
      )}
      {content.run && (
        <circle
          cx={glyphX}
          cy={cy}
          r={glyphR}
          fill={content.run === "run" ? "var(--dx-ink)" : content.run === "tripped" ? MX.bad : "none"}
          stroke={content.run === "tripped" ? MX.bad : "var(--dx-ink)"}
          strokeWidth={fontSz * 0.12}
        />
      )}
      <text
        y={cy + textDy}
        fontSize={fontSz}
        style={{ fontVariantNumeric: "tabular-nums" }}
        // Unboxed text: a panel-coloured halo under the glyphs so drawing lines never run through them.
        stroke={boxed ? undefined : MX.padPanel}
        strokeWidth={boxed ? undefined : fontSz * 0.32}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {content.label && (
          <tspan x={labelX} fontSize={m.labelSz} fontWeight={600} letterSpacing={m.labelSz * 0.04} fill={MX.label}>
            {content.label}
          </tspan>
        )}
        <tspan x={valueX} fontWeight={content.state && !abnormal ? 500 : 700} fill={valueFill}>
          {content.value}
        </tspan>
        {content.sp && (
          <tspan x={spX} fontSize={m.labelSz} fontWeight={600} fill={MX.label}>
            SP {content.sp}
          </tspan>
        )}
      </text>
    </g>
  );
}
