"use client";

/**
 * Preview of the drawings made with the machine-diagram-2d / -3d skills
 * (src/components/assets/diagrams, src/components/home/twin/models), through
 * the same components the app uses: the 2D sheet in MachineSchematic (a
 * machine's Overview drawing), the 3D model in KitModelCanvas. Lists the
 * drawings registered in code and those stored in the DB (`diagrams`). No readings:
 * sensors appear on a real machine of that drawing kind, at their DB places.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { MachineSchematic } from "@/components/assets/machine-schematic";
import type { AssetMachine } from "@/components/assets/assets-data";
import { DIAGRAM_SHEETS } from "@/components/assets/diagrams";
import { KIT_MODELS, kitModelForType } from "@/components/home/twin/models";
import { useDbDiagram } from "@/components/assets/diagrams/db-diagrams";
import { useTwinColors } from "@/components/home/twin/plant-twin";
import { TwinNavBar } from "@/components/home/twin/twin-nav-ui";
import type { TwinCameraCommand } from "@/components/home/twin/plant-twin-canvas";
import { useTheme } from "@/providers/theme-provider";

const KitModelCanvas = dynamic(() => import("@/components/home/twin/kit-model-canvas"), {
  ssr: false,
  loading: () => <Empty>Loading the 3D model…</Empty>,
});

const panel: React.CSSProperties = {
  position: "relative",
  border: "1px solid var(--separator)",
  borderRadius: "var(--radius-md)",
  background: "var(--mx-canvas)",
  overflow: "hidden",
};
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}
const caption: React.CSSProperties = { fontSize: "var(--fs-xs)", color: "var(--text-muted)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" };

export default function GeneratedDiagramsPreview() {
  const { theme, toggleTheme } = useTheme();
  const colors = useTwinColors();
  // Stored drawings (no data): which kinds exist in the DB and in which dimensions.
  const [stored, setStored] = useState<Array<{ diagramType: string; kind: "2d" | "3d"; name: string }>>([]);
  useEffect(() => {
    fetch("/api/diagrams")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setStored(b?.data ?? []))
      .catch(() => setStored([]));
  }, []);
  const kinds = useMemo(() => {
    const ids = [...new Set([...DIAGRAM_SHEETS.map((d) => d.diagramType), ...KIT_MODELS.map((m) => m.diagramType), ...stored.map((d) => d.diagramType)])];
    return ids.map((id) => ({
      id,
      label:
        DIAGRAM_SHEETS.find((d) => d.diagramType === id)?.label ??
        KIT_MODELS.find((m) => m.diagramType === id)?.model.name ??
        stored.find((d) => d.diagramType === id)?.name ??
        id,
    }));
  }, [stored]);
  const [picked, setKind] = useState<string | null>(null);
  const kind = picked ?? kinds[0]?.id ?? "";
  const sheet = DIAGRAM_SHEETS.find((d) => d.diagramType === kind) ?? stored.find((d) => d.diagramType === kind && d.kind === "2d");
  const sheetLabel = kinds.find((k) => k.id === kind)?.label ?? kind;
  useDbDiagram("3d", kind, !stored.some((d) => d.diagramType === kind && d.kind === "3d"));
  const model = kitModelForType(kind);
  const [parts, setParts] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [command, setCommand] = useState<TwinCameraCommand>({ kind: "fit", n: 0 });
  const pick = useCallback((p: string | null) => {
    setSelected(p);
    setCommand((c) => ({ kind: p ? "focus" : "fit", n: c.n + 1 }));
  }, []);

  return (
    <main style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "var(--workspace-bg)", minHeight: "100vh", color: "var(--text-primary)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Drawings made with the diagram skills</h1>
        <PillNav
          items={kinds}
          activeId={kind}
          onChange={(id) => {
            setKind(id);
            setSelected(null);
            setParts([]);
          }}
          ariaLabel="Drawing kind"
        />
        <span style={{ flex: 1 }} />
        <PillButton variant="secondary" onClick={toggleTheme}>
          {theme === "dark" ? "Light theme" : "Dark theme"}
        </PillButton>
      </header>
      <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
        A machine shows these when its drawing style is <b style={{ color: "var(--text-primary)", fontWeight: 500 }}>{kinds.find((k) => k.id === kind)?.label}</b>. Its sensors then
        appear on the drawing at their saved places.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 560px), 1fr))", gap: 12 }}>
        <section>
          <h2 style={caption}>2D drawing · machine overview</h2>
          <div style={{ ...panel, height: 560, padding: 12 }}>
            {sheet ? (
              <MachineSchematic diagramType={kind as AssetMachine["diagramType"]} dots={[]} label={`${sheetLabel} drawing`} />
            ) : (
              <Empty>No 2D drawing of this kind</Empty>
            )}
          </div>
        </section>

        <section>
          <h2 style={caption}>3D model</h2>
          <div style={{ ...panel, height: 560 }}>
            {model && colors ? (
              <KitModelCanvas key={model.id} model={model} colors={colors} selected={selected} onSelect={pick} command={command} onParts={setParts} />
            ) : (
              <Empty>{model ? "Loading the 3D model…" : "No 3D model of this kind"}</Empty>
            )}
            {model && (
              <div style={{ position: "absolute", left: 10, bottom: 10, right: 10 }}>
                <TwinNavBar onReset={() => pick(null)} />
              </div>
            )}
          </div>
          {parts.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }} role="group" aria-label="Parts">
              {parts.map((p) => (
                <PillButton key={p} variant="secondary" pressed={p === selected} onClick={() => pick(p === selected ? null : p)}>
                  {p}
                </PillButton>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
