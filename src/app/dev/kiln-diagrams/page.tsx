"use client";

import { useState } from "react";
import {
  KILN_MACHINES,
  KILN_SUB_ASSEMBLIES,
  KilnOverviewDiagram,
  KilnSubAssemblyDiagram,
  type KilnReading,
  type KilnSubAssemblyId,
} from "@/components/assets/kiln-diagrams";

/* Demo values from D4-OSW-PE-KLN Rev. 02, figures 5.1–5.4. */
const n = (value: string, unit?: string): KilnReading => ({ value, unit, status: "normal" });
const DEMO: Record<string, KilnReading> = {
  "TMP-KLN-20": n("60.5", "°C"),
  "TMP-KLN-21": n("100.0", "°C"),
  "ELE-KLN-01": n("62.1", "%"),
  "VIB-KLN-01": n("1.60", "mm/s"),
  "TMP-KLN-19": n("65.0", "°C"),
  "SPD-KLN-01": n("3.80", "rpm"),
  "VIB-KLN-02": n("1.85", "mm/s"),
  "TMP-KLN-22": n("69.9", "°C"),
  "VIB-KLN-03": n("1.51", "mm/s"),
  "TMP-KLN-23": n("67.7", "°C"),
  "STS-KLN-05": n("OK"),
  "VIB-KLN-04": n("2.33", "mm/s"),
  "TMP-KLN-15": n("59.8", "°C"),
  "LEV-KLN-01": n("LEVEL OK"),
  "FLO-KLN-05": n("FLOW OK"),
  "PRS-KLN-04": n("2.12", "bar"),
  "STS-KLN-11": n("READY"),
  "TMP-KLN-01": n("57.8", "°C"),
  "TMP-KLN-02": n("59.4", "°C"),
  "TMP-KLN-03": n("57.1", "°C"),
  "TMP-KLN-04": n("58.5", "°C"),
  "TMP-KLN-05": n("62.0", "°C"),
  "TMP-KLN-06": n("62.5", "°C"),
  "TMP-KLN-07": n("61.3", "°C"),
  "TMP-KLN-08": n("62.0", "°C"),
  "TMP-KLN-09": n("59.0", "°C"),
  "TMP-KLN-10": n("58.0", "°C"),
  "TMP-KLN-11": n("60.0", "°C"),
  "TMP-KLN-12": n("59.2", "°C"),
  "POS-KLN-01": n("-3.1", "mm"),
  "PRS-KLN-07": n("90", "bar"),
  "POS-KLN-02": n("CLEAR"),
  "CAL-KLN-03": n("327", "°C"),
  "STS-KLN-08": n("95.9", "%"),
  "GAS-KLN-01": n("2.59", "vol%"),
  "GAS-KLN-02": n("408", "ppm"),
  "TMP-KLN-13": n("1,086", "°C"),
  "PRS-KLN-01": n("-3.82", "mbar"),
  "STS-KLN-06": n("OK"),
  "CAL-KLN-06": n("-0.02", "vol%"),
  "CAL-KLN-07": n("37", "mm"),
  "STS-KLN-10": n("RUNNING"),
  "PRS-KLN-03": n("-0.29", "mbar"),
  "FLO-KLN-01": n("330", "t/h"),
  "FLO-KLN-02": n("10.57", "t/h"),
  "TMP-KLN-14": n("1,448", "°C"),
};

const ALL_NORMAL = Object.fromEntries(KILN_SUB_ASSEMBLIES.map((s) => [s.id, "normal" as const]));

export default function KilnDiagramsPreview() {
  const [selected, setSelected] = useState<KilnSubAssemblyId>("station-2");
  const [tag, setTag] = useState<string | null>(null);

  return (
    <main style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "var(--workspace-bg)", minHeight: "100vh" }}>
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: "0 0 12px" }}>KLN-01 overview</h2>
        <KilnOverviewDiagram status={ALL_NORMAL} selected={selected} onSelect={setSelected} />
      </section>

      {KILN_MACHINES.map((m) => (
        <section key={m.tag}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: "0 0 12px" }}>
            {m.name} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{m.tag}</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))", gap: 16 }}>
            {KILN_SUB_ASSEMBLIES.filter((s) => s.machine === m.tag).map((s) => (
              <figure key={s.id} id={s.id} style={{ margin: 0 }}>
                <KilnSubAssemblyDiagram id={s.id} readings={DEMO} selectedTag={tag} onSelectTag={setTag} />
                <figcaption style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>{s.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
