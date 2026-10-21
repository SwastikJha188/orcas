/**
 * Drawing layout of the 15 D5 §5 sub-assembly windows for the kiln-seal fleet
 * (720 × 310 plane of the schematics in kiln-component-diagrams.tsx): where
 * each measurement point sits on its drawing and where its callout goes.
 *
 * Layout only. Which sub-assemblies exist, their names, health and sensors
 * (`subassemblies[].sensorTags`), limits and failure modes (the rules each
 * sensor feeds, `sensors[].reasons`) come from the DB catalog
 * (`useMachineCatalog`). A pin is drawn only for a tag the catalog lists
 * under that sub-assembly; label, value, unit and status are filled from the
 * catalog / live frame by the consumer.
 */
import { SIGNAL_BY_TAG } from "@shared/lib/kiln-sim/signals";
import type { DiagramPin } from "./kiln-component-diagrams";

/** One drawing window: its id (the DB sub-assembly id), title block and pin geometry. */
export interface SubAssemblySpec {
  /** DB sub-assembly id the drawing belongs to. */
  id: string;
  /** System the drawing sits under (title block). */
  machineTag: string;
  /** Drawing title (the DB name replaces it wherever the catalog is loaded). */
  name: string;
  shortName: string;
  /** Pin geometry by tag; label / value / status are placeholders until the catalog fills them. */
  pins: DiagramPin[];
}

type PinSeed = [id: string, tag: string, x: number, y: number, calloutX: number, calloutY: number, anchor: "left" | "right"];

/** Geometry → drawing pin. The label falls back to the engine's signal name (or the tag) until the catalog names it. */
function pins(seeds: PinSeed[]): DiagramPin[] {
  return seeds.map(([id, tag, x, y, calloutX, calloutY, anchor]) => ({
    id,
    tag,
    label: SIGNAL_BY_TAG[tag]?.name ?? tag,
    value: "—",
    unit: SIGNAL_BY_TAG[tag]?.unit ?? "",
    status: "Normal",
    x,
    y,
    calloutX,
    calloutY,
    anchor,
  }));
}

const win = (id: string, machineTag: string, title: string, seeds: PinSeed[]): SubAssemblySpec => ({ id, machineTag, name: title, shortName: title, pins: pins(seeds) });

const station = (n: 1 | 2 | 3, tags: [string, string, string, string]): SubAssemblySpec =>
  win(`station-${n}`, "SUP-KLN-01", `Station ${n}`, [
    ["P1", tags[0], 292, 87, 160, 50, "right"],
    ["P2", tags[2], 292, 257, 160, 285, "right"],
    ["P3", tags[1], 408, 87, 540, 50, "left"],
    ["P4", tags[3], 408, 257, 540, 285, "left"],
  ]);

/** All 15 sub-assembly windows, in D5 §5 order. */
export const KILN_SUB_ASSEMBLIES: SubAssemblySpec[] = [
  win("main-motor", "DRV-KLN-01", "Main Motor", [
    ["P1", "TMP-KLN-20", 216, 171, 160, 140, "right"],
    ["P2", "TMP-KLN-21", 280, 152, 160, 215, "right"],
    ["P3", "ELE-KLN-01", 405, 52, 520, 52, "left"],
    ["P4", "VIB-KLN-01", 464, 151, 520, 125, "left"],
    ["P5", "TMP-KLN-19", 464, 191, 520, 195, "left"],
    ["P6", "SPD-KLN-01", 535, 172, 520, 265, "left"],
  ]),
  win("gearbox", "DRV-KLN-01", "Main Gearbox", [
    ["P1", "VIB-KLN-02", 265, 160, 160, 85, "right"],
    ["P2", "TMP-KLN-22", 265, 195, 160, 175, "right"],
    ["P3", "VIB-KLN-03", 430, 170, 520, 95, "left"],
    ["P4", "TMP-KLN-23", 430, 205, 520, 185, "left"],
  ]),
  win("pinion-gear", "DRV-KLN-01", "Pinion & Girth Gear", [
    ["P1", "STS-KLN-05", 360, 160, 160, 80, "right"],
    ["P2", "VIB-KLN-04", 421, 215, 540, 150, "left"],
    ["P3", "SPD-KLN-01", 360, 208, 160, 250, "right"],
  ]),
  win("lubrication", "DRV-KLN-01", "Lubrication", [
    ["P1", "TMP-KLN-15", 370, 185, 160, 60, "right"],
    ["P2", "LEV-KLN-01", 230, 166, 160, 230, "right"],
    ["P3", "FLO-KLN-05", 550, 130, 570, 60, "left"],
    ["P4", "PRS-KLN-04", 530, 185, 570, 245, "left"],
  ]),
  win("auxiliary-drive", "DRV-KLN-01", "Auxiliary Drive", [["P1", "STS-KLN-11", 334, 192, 560, 110, "left"]]),
  station(1, ["TMP-KLN-01", "TMP-KLN-02", "TMP-KLN-03", "TMP-KLN-04"]),
  station(2, ["TMP-KLN-05", "TMP-KLN-06", "TMP-KLN-07", "TMP-KLN-08"]),
  station(3, ["TMP-KLN-09", "TMP-KLN-10", "TMP-KLN-11", "TMP-KLN-12"]),
  win("thrust", "SUP-KLN-01", "Thrust Station", [
    ["P1", "POS-KLN-01", 420, 135, 520, 85, "left"],
    ["P2", "PRS-KLN-07", 430, 205, 520, 175, "left"],
    ["P3", "POS-KLN-02", 204, 268, 160, 175, "right"],
  ]),
  win("shell-refractory", "SHL-KLN-01", "Shell Scanner", [
    ["P1", "CAL-KLN-03", 360, 220, 160, 85, "right"],
    ["P2", "STS-KLN-08", 330, 27, 520, 85, "left"],
  ]),
  win("inlet-seal", "SHL-KLN-01", "Inlet Seal", [
    ["P1", "GAS-KLN-01", 215, 175, 150, 120, "right"],
    ["P2", "TMP-KLN-13", 215, 215, 150, 245, "right"],
    ["P3", "CAL-KLN-06", 280, 110, 560, 70, "left"],
    ["P4", "CAL-KLN-07", 280, 250, 560, 265, "left"],
  ]),
  win("outlet-seal", "SHL-KLN-01", "Outlet Seal", [
    ["P1", "CAL-KLN-07", 425, 115, 160, 70, "right"],
    ["P2", "STS-KLN-10", 400, 285, 160, 280, "right"],
    ["P3", "PRS-KLN-03", 505, 75, 570, 60, "left"],
  ]),
  win("kiln-inlet", "PRC-KLN-01", "Kiln Inlet", [
    ["P1", "STS-KLN-06", 215, 108, 150, 50, "right"],
    ["P2", "GAS-KLN-01", 250, 200, 150, 170, "right"],
    ["P3", "GAS-KLN-02", 250, 235, 150, 270, "right"],
    ["P4", "TMP-KLN-13", 300, 178, 560, 120, "left"],
    ["P5", "PRS-KLN-01", 315, 258, 560, 260, "left"],
  ]),
  win("feed-fuel", "PRC-KLN-01", "Feed & Fuel", [
    ["P1", "FLO-KLN-01", 250, 145, 150, 200, "right"],
    ["P2", "FLO-KLN-02", 480, 160, 580, 100, "left"],
  ]),
  win("burner-hood", "PRC-KLN-01", "Burner & Hood", [
    ["P1", "TMP-KLN-14", 460, 40, 300, 40, "right"],
    ["P2", "PRS-KLN-03", 490, 135, 570, 135, "left"],
  ]),
];
