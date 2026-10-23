/**
 * Regenerates src/components/assets/pyro/pyro-layout.ts (pad positions of each pyro machine's overview sheet,
 * as pure data for the server seed) and prints the SQL that moves the seeded measurement points to them.
 *
 *   npx tsx scripts/gen-pyro-layout.tsx [--sql out.sql]
 */
import { writeFileSync } from "node:fs";
import { LINE_SHEETS, lineSheetTags } from "@/components/assets/pyro/line-sheets";
import { LINE_SHEET_ART } from "@/components/assets/pyro/line-sheets/art";
import { PYRO_MACHINES } from "@shared/lib/pyro-sim/signals";

const layout: Record<string, { sheet: string; width: number; height: number; pads: Record<string, [number, number]>; windows: Record<string, never> }> = {};
for (const m of PYRO_MACHINES) {
  // Its own group's overview (P-0 also carries the burner's calciner points, B-0 is the burner's sheet).
  const overviews = LINE_SHEETS.filter((s) => s.kind === "overview" && s.machines.includes(m.id));
  const sheet = overviews.find((s) => s.machines[0] === m.id) ?? overviews[0];
  const art = sheet ? LINE_SHEET_ART[sheet.id] : null;
  if (!sheet || !art) continue;
  const pads = Object.fromEntries(lineSheetTags(sheet.id).filter((t) => art.pads[t]).map((t) => [t, art.pads[t]]));
  layout[m.id] = { sheet: sheet.id, width: art.width, height: art.height, pads, windows: {} };
}

const head = `/**
 * Pad positions of the pyro machine drawings, as pure data for the server seed
 * (sensor x / y = pad as % of the drawing). Each machine's drawing is its
 * group's overview sheet of the diagram pack (line-sheets/art, F-0 … H-0).
 * GENERATED from those sheets by scripts/gen-pyro-layout.tsx — regenerate after moving a pad.
 */
export interface PyroLayout {
  /** Overview sheet the pads come from. */
  sheet: string;
  width: number;
  height: number;
  pads: Record<string, [number, number]>;
  windows: Record<string, [number, number, number, number]>;
}

export const PYRO_LAYOUT: Record<string, PyroLayout> = `;
writeFileSync("src/components/assets/pyro/pyro-layout.ts", `${head}${JSON.stringify(layout, null, 2)};\n`);

const sqlAt = process.argv.indexOf("--sql");
if (sqlAt > 0) {
  // A measurement point takes the pad of its first tag on its machine's overview sheet.
  const rows = Object.values(layout).flatMap((l) =>
    Object.entries(l.pads).map(([tag, [x, y]]) => `('${tag}', ${((x / l.width) * 100).toFixed(2)}, ${((y / l.height) * 100).toFixed(2)})`),
  );
  const sql = `UPDATE measurement_points p SET diagram_x = v.x, diagram_y = v.y
FROM (VALUES
  ${rows.join(",\n  ")}
) AS v(tag, x, y)
JOIN measurements m ON m.tag = v.tag
WHERE p.id = m.point_id AND m.id LIKE 'PYR-%';
`;
  writeFileSync(process.argv[sqlAt + 1], sql);
}
console.log(Object.entries(layout).map(([m, l]) => `${m} ${l.sheet} ${Object.keys(l.pads).length}`).join("\n"));
