"use client";

/**
 * Preview of a drawing kind made from a photo (stored in `diagrams`): the 2D
 * sheet as the machine Overview draws it (MachineSchematic) and the 3D model
 * in the twin viewer (KitModelCanvas), side by side. Shown in Configure's Add
 * plant / Add machine forms before anything is added.
 */
import dynamic from "next/dynamic";
import React, { useState } from "react";
import { MachineSchematic } from "@/components/assets/machine-schematic";
import type { AssetMachine } from "@/components/assets/assets-data";
import { dbFetched, useDbDiagram } from "@/components/assets/diagrams/db-diagrams";
import { kitModelForType } from "@/components/home/twin/models";
import { useTwinColors } from "@/components/home/twin/plant-twin";
import type { TwinCameraCommand } from "@/components/home/twin/plant-twin-canvas";

const KitModelCanvas = dynamic(() => import("@/components/home/twin/kit-model-canvas"), {
  ssr: false,
  loading: () => <span className="cfg-preview-empty">Loading the 3D model…</span>,
});

export function DrawingPreview({ kind, label }: { kind: string; label: string }) {
  const colors = useTwinColors();
  const [selected, setSelected] = useState<string | null>(null);
  const [command, setCommand] = useState<TwinCameraCommand>({ kind: "fit", n: 0 });
  // Loads the stored 3D model of this kind (the 2D sheet is loaded by MachineSchematic itself).
  useDbDiagram("3d", kind);
  const model = kitModelForType(kind);
  const fetched = dbFetched("3d", kind);
  return (
    <div className="cfg-preview">
      <figure className="cfg-preview-pane">
        <figcaption>2D drawing</figcaption>
        <div className="cfg-preview-box">
          <MachineSchematic diagramType={kind as AssetMachine["diagramType"]} dots={[]} label={`${label} drawing`} />
        </div>
      </figure>
      <figure className="cfg-preview-pane">
        <figcaption>3D model{selected ? ` · ${selected}` : ""}</figcaption>
        <div className="cfg-preview-box cfg-preview-3d">
          {model && colors ? (
            <KitModelCanvas
              key={model.id}
              model={model}
              colors={colors}
              selected={selected}
              onSelect={(p) => {
                setSelected(p);
                setCommand((c) => ({ kind: p ? "focus" : "fit", n: c.n + 1 }));
              }}
              command={command}
            />
          ) : (
            <span className="cfg-preview-empty">{fetched ? "No 3D model was made from this photo" : "Loading the 3D model…"}</span>
          )}
        </div>
      </figure>
    </div>
  );
}
