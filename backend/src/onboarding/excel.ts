/**
 * The onboarding draft as an Excel workbook: one sheet per level of the asset
 * hierarchy (Plant, Areas, Machines, Parts, Sensors) plus a "How to fill"
 * sheet and a hidden "Lists" sheet that feeds the drop-downs.
 *
 * `buildWorkbook` writes the format, filled with what the draft already holds
 * (an empty draft gives the blank format). `importWorkbook` reads a filled-in
 * copy back into a draft: rows are matched by area name, machine code (or
 * name), part name and sensor tag; a matched row takes the workbook's values,
 * an empty cell keeps what the draft has, and unknown rows are added. Nothing
 * is removed. Columns are found by their header text, so their order may change.
 */
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { InputError } from "@backend/errors";
import { guessQuantity, type DraftArea, type DraftMachine, type DraftPoint, type OnboardingDraft } from "@shared/types/onboarding";

export interface ExcelReference {
  quantities: Array<{ id: string; name: string }>;
  units: Array<{ id: string; symbol: string; name: string }>;
}

export interface ExcelImportSummary {
  plant: boolean;
  added: { areas: number; machines: number; parts: number; sensors: number };
  updated: { areas: number; machines: number; parts: number; sensors: number };
  /** Rows that were skipped or read with a guess, as plain sentences ("Sensors row 12: …"). */
  notes: string[];
}

const MAX_ROWS = 20_000;
/** Rows of the format that carry drop-downs. */
const FORM_ROWS = 2000;

const IMPORTANCE: DraftMachine["criticality"][] = ["A (Critical)", "B (Essential)", "C (General)"];
const READING_KINDS = ["Number", "On/off"];
const ORIGINS = ["Online", "Manual", "Calculated"];

interface Col {
  header: string;
  /** Other header texts read as this column. */
  aka?: string[];
  note: string;
  width: number;
  required?: boolean;
  /** Drop-down source (a range formula). */
  list?: string;
}

/* ---------------------------------------------------------------- columns */

const PLANT_FIELDS: Array<{ key: keyof OnboardingDraft["plant"]; label: string; aka?: string[]; note: string; required?: boolean }> = [
  { key: "name", label: "Name", aka: ["plant name", "site name", "plant", "site"], note: "The plant's full name", required: true },
  { key: "code", label: "Code", aka: ["plant code", "site code"], note: "Short code: letters, digits and dashes (e.g. LUM-04)", required: true },
  { key: "shortName", label: "Short name", aka: ["short"], note: "Name used where space is tight" },
  { key: "region", label: "Region", aka: ["country", "state", "province"], note: "Country or region" },
  { key: "location", label: "Location", aka: ["address", "town", "city"], note: "Town or address" },
  { key: "coordinates", label: "Coordinates", aka: ["gps", "lat long", "latitude longitude"], note: "Latitude, longitude" },
  { key: "timeZone", label: "Time zone", aka: ["timezone", "tz"], note: "As Region/City (e.g. Africa/Lusaka)", required: true },
  { key: "description", label: "Description", aka: ["about"], note: "What the plant makes" },
  { key: "designCapacity", label: "Design capacity", aka: ["capacity"], note: "e.g. 3,000 t/day clinker" },
];
const plantField = (label: string) => {
  const h = headerKey(label);
  return h ? PLANT_FIELDS.find((f) => headerKey(f.label) === h || f.aka?.some((a) => headerKey(a) === h)) : undefined;
};

const AREA_COLS = {
  name: { header: "Area", aka: ["area name", "name", "section", "section name"], note: "A factory, section, line or building of the plant", width: 32, required: true },
  parent: { header: "Inside area", aka: ["parent", "parent area", "inside", "part of", "parent section", "inside section"], note: "The area it sits in; leave empty when it sits directly under the plant", width: 32, list: "Areas!$A$2:$A$500" },
} satisfies Record<string, Col>;

const MACHINE_COLS = {
  code: { header: "Machine code", aka: ["code", "equipment code", "tag"], note: "The plant's own equipment code (e.g. KLN-01)", width: 16, required: true },
  name: { header: "Machine name", aka: ["name", "machine", "equipment name", "equipment", "description"], note: "e.g. Rotary kiln", width: 30, required: true },
  area: { header: "Area", aka: ["section", "area name"], note: "Name of an area from the Areas sheet; empty = directly under the plant", width: 24, list: "Areas!$A$2:$A$500" },
  type: { header: "Type", aka: ["kind", "machine type", "equipment type"], note: "Plain kind (e.g. rotary kiln, vacuum casting cell)", width: 22 },
  manufacturer: { header: "Manufacturer", aka: ["make", "oem"], note: "", width: 18 },
  model: { header: "Model", note: "", width: 16 },
  powerRating: { header: "Power rating", aka: ["power", "rating", "motor rating", "kw"], note: "e.g. 315 kW", width: 14 },
  operatingSpeed: { header: "Operating speed", aka: ["speed"], note: "e.g. 3.5 rpm", width: 16 },
  criticality: { header: "Importance", aka: ["criticality"], note: "A (Critical), B (Essential) or C (General); empty = B", width: 16, list: "Lists!$C$2:$C$4" },
} satisfies Record<string, Col>;

const PART_COLS = {
  machine: { header: "Machine code", aka: ["machine", "code", "equipment", "equipment code"], note: "Code from the Machines sheet", width: 16, required: true, list: "Machines!$A$2:$A$2000" },
  name: { header: "Part", aka: ["part name", "component", "sub-assembly", "subassembly", "name"], note: "A part of the machine (e.g. Inlet seal, Main drive)", width: 32, required: true },
} satisfies Record<string, Col>;

const SENSOR_COLS = {
  tag: { header: "Tag", aka: ["sensor tag", "tag no", "tag number"], note: "The sensor's tag, unique in the plant (e.g. TMP-KLN-01)", width: 18, required: true },
  name: { header: "Sensor name", aka: ["name", "description"], note: "What it reads (e.g. Inlet gas temperature); empty = the tag", width: 30 },
  machine: { header: "Machine code", aka: ["machine", "equipment", "equipment code"], note: "Code from the Machines sheet", width: 16, required: true, list: "Machines!$A$2:$A$2000" },
  part: { header: "Part", aka: ["component", "sub-assembly", "subassembly"], note: "The part it sits on; a new name adds the part", width: 24, required: true },
  location: { header: "Location", note: "Where on the part", width: 18 },
  quantity: { header: "Measures", aka: ["quantity", "measured quantity"], note: "What it measures; empty = guessed from tag and unit", width: 22, list: "Lists!$A$2:$A$200" },
  unit: { header: "Unit", aka: ["units", "uom"], note: "e.g. °C, bar, mm/s, A", width: 10, list: "Lists!$B$2:$B$500" },
  valueKind: { header: "Reading kind", aka: ["value kind", "type"], note: "Number or On/off; empty = Number", width: 13, list: "Lists!$D$2:$D$3" },
  origin: { header: "Origin", aka: ["source"], note: "Online (wired), Manual (read by hand) or Calculated; empty = Online", width: 12, list: "Lists!$E$2:$E$4" },
  signalType: { header: "Signal type", aka: ["signal"], note: "e.g. 4–20 mA, RTD PT100, Modbus", width: 14 },
  rangeLo: { header: "Range from", aka: ["range low", "range min", "min"], note: "Lowest value the sensor can read", width: 11 },
  rangeHi: { header: "Range to", aka: ["range high", "range max", "max"], note: "Highest value the sensor can read", width: 11 },
  nominalLo: { header: "Normal from", aka: ["nominal low", "normal low"], note: "Lowest value in normal running", width: 12 },
  nominalHi: { header: "Normal to", aka: ["nominal high", "normal high"], note: "Highest value in normal running", width: 12 },
  ll: { header: "LL", aka: ["low low", "lo lo", "lolo", "low low alarm"], note: "Critical low limit", width: 8 },
  l: { header: "L", aka: ["low", "lo", "low alarm"], note: "Alert low limit", width: 8 },
  h: { header: "H", aka: ["high", "hi", "high alarm"], note: "Alert high limit", width: 8 },
  hh: { header: "HH", aka: ["high high", "hi hi", "hihi", "high high alarm"], note: "Critical high limit", width: 8 },
  priority: { header: "Priority", note: "", width: 10 },
  remarks: { header: "Remarks", aka: ["notes", "comment"], note: "", width: 30 },
} satisfies Record<string, Col>;

const SHEETS = { plant: "Plant", areas: "Areas", machines: "Machines", parts: "Parts", sensors: "Sensors" } as const;
/** Other sheet names read as each sheet (compared without case, spaces or punctuation). */
const SHEET_AKA: Record<keyof typeof SHEETS, string[]> = {
  plant: ["site", "plant details", "site details"],
  areas: ["sections", "area list", "section list", "locations"],
  machines: ["machine list", "equipment", "equipment list", "assets", "asset list"],
  parts: ["components", "component list", "sub assemblies", "subassemblies", "part list"],
  sensors: ["sensor list", "instruments", "instrument list", "instrument index", "tags", "tag list", "signals", "measurement points", "io list"],
};

const GUIDE = [
  "How to fill this workbook",
  "",
  "Each sheet is one level of the plant: Plant › Areas › Machines › Parts › Sensors.",
  "Columns marked * are needed. Hover a column title for what it means.",
  "Plant: fill the Value column.",
  "Areas: one row per factory, section, line or building. 'Inside area' names the area it sits in.",
  "Machines: one row per machine. 'Area' names an area from the Areas sheet.",
  "Parts: one row per part of a machine. Parts named on the Sensors sheet are added too.",
  "Sensors: one row per sensor. 'Machine code' and 'Part' place it on its machine.",
  "",
  "Uploading again updates rows with the same area name, machine code, part name or sensor tag;",
  "an empty cell keeps what the onboarding already holds, and nothing is removed.",
  "Everything stays editable on the onboarding steps until the plant is created.",
];

/* ---------------------------------------------------------------- build */

type ValidatingSheet = ExcelJS.Worksheet & { dataValidations: { add(address: string, v: ExcelJS.DataValidation): void } };

const colLetter = (n: number) => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
  row.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6EAEF" } };
    c.border = { bottom: { style: "thin", color: { argb: "FF8C959F" } } };
  });
}

function tableSheet(wb: ExcelJS.Workbook, name: string, cols: Record<string, Col>, rows: Array<Record<string, string | number | null>>) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] }) as ValidatingSheet;
  const entries = Object.entries(cols);
  ws.columns = entries.map(([key, c]) => ({ key, header: c.required ? `${c.header} *` : c.header, width: c.width }));
  styleHeader(ws.getRow(1));
  entries.forEach(([, c], i) => {
    if (c.note) ws.getCell(1, i + 1).note = c.note;
    if (c.list) {
      const L = colLetter(i + 1);
      ws.dataValidations.add(`${L}2:${L}${FORM_ROWS}`, {
        type: "list",
        allowBlank: true,
        formulae: [c.list],
        // Values outside the list are allowed (a new unit, an area named later); the import reads them.
        showErrorMessage: false,
      });
    }
  });
  for (const r of rows) ws.addRow(r);
  return ws;
}

/** The format, filled with what the draft holds. */
export async function buildWorkbook(d: OnboardingDraft, ref: ExcelReference): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ULTRON";
  wb.created = new Date();

  const guide = wb.addWorksheet("How to fill");
  guide.getColumn(1).width = 110;
  GUIDE.forEach((line, i) => (guide.getCell(i + 1, 1).value = line));
  guide.getCell(1, 1).font = { bold: true, size: 14 };

  const plant = wb.addWorksheet(SHEETS.plant, { views: [{ state: "frozen", ySplit: 1 }] });
  plant.columns = [
    { header: "Field", key: "field", width: 20 },
    { header: "Value", key: "value", width: 48 },
    { header: "What to write", key: "note", width: 56 },
  ];
  styleHeader(plant.getRow(1));
  for (const f of PLANT_FIELDS) {
    const row = plant.addRow({ field: f.required ? `${f.label} *` : f.label, value: d.plant[f.key] ?? "", note: f.note });
    row.getCell(1).font = { bold: true };
    row.getCell(3).font = { color: { argb: "FF57606A" } };
  }

  const areaName = (k: string | null) => d.areas.find((a) => a.key === k)?.name ?? null;
  tableSheet(wb, SHEETS.areas, AREA_COLS, d.areas.map((a) => ({ name: a.name, parent: areaName(a.parentKey) })));

  const machineCode = (k: string | null) => {
    const m = d.machines.find((mm) => mm.key === k);
    return m ? m.code || m.name : null;
  };
  tableSheet(
    wb,
    SHEETS.machines,
    MACHINE_COLS,
    d.machines.map((m) => ({
      code: m.code,
      name: m.name,
      area: areaName(m.areaKey),
      type: m.type,
      manufacturer: m.manufacturer,
      model: m.model,
      powerRating: m.powerRating,
      operatingSpeed: m.operatingSpeed,
      criticality: m.criticality,
    })),
  );
  tableSheet(
    wb,
    SHEETS.parts,
    PART_COLS,
    d.machines.flatMap((m) => m.components.map((c) => ({ machine: m.code || m.name, name: c.name }))),
  );

  const quantityName = (id: string | null) => ref.quantities.find((q) => q.id === id)?.name ?? id;
  const partName = (p: DraftPoint) => d.machines.find((m) => m.key === p.machineKey)?.components.find((c) => c.key === p.componentKey)?.name ?? null;
  tableSheet(
    wb,
    SHEETS.sensors,
    SENSOR_COLS,
    d.points.map((p) => ({
      tag: p.tag,
      name: p.name,
      machine: machineCode(p.machineKey),
      part: partName(p),
      location: p.location,
      quantity: quantityName(p.quantity),
      unit: p.unit,
      valueKind: p.valueKind === "state" ? "On/off" : "Number",
      origin: p.origin[0].toUpperCase() + p.origin.slice(1),
      signalType: p.signalType,
      rangeLo: p.rangeLo,
      rangeHi: p.rangeHi,
      nominalLo: p.nominalLo,
      nominalHi: p.nominalHi,
      ll: p.ll,
      l: p.l,
      h: p.h,
      hh: p.hh,
      priority: p.priority,
      remarks: p.remarks,
    })),
  );

  const lists = wb.addWorksheet("Lists", { state: "hidden" });
  lists.getRow(1).values = ["Measures", "Unit", "Importance", "Reading kind", "Origin"];
  const column = (n: number, values: string[]) => values.forEach((v, i) => (lists.getCell(i + 2, n).value = v));
  column(1, ref.quantities.map((q) => q.name));
  column(2, [...new Set(ref.units.map((u) => u.symbol))]);
  column(3, IMPORTANCE);
  column(4, READING_KINDS);
  column(5, ORIGINS);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ---------------------------------------------------------------- read */

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("").trim();
    if ("formula" in v || "sharedFormula" in v) return cellText((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ("text" in v) return String((v as ExcelJS.CellHyperlinkValue).text).trim();
  }
  return "";
}

const headerKey = (s: string) => s.toLowerCase().replace(/\*/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const same = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function findSheet(wb: ExcelJS.Workbook, sheet: keyof typeof SHEETS): ExcelJS.Worksheet | undefined {
  const names = [SHEETS[sheet], ...SHEET_AKA[sheet]].map(headerKey);
  return wb.worksheets.find((w) => w.name !== "Lists" && names.includes(headerKey(w.name)));
}

/** The sheet's rows as { column key → cell text }, with their row numbers; empty rows are left out. */
function readTable<K extends string>(ws: ExcelJS.Worksheet, cols: Record<K, Col>): Array<{ row: number; get: (k: K) => string; raw: (k: K) => ExcelJS.CellValue }> {
  const at = new Map<K, number>();
  ws.getRow(1).eachCell((cell, n) => {
    const h = headerKey(cellText(cell.value));
    for (const [k, c] of Object.entries(cols) as Array<[K, Col]>) {
      if (at.has(k)) continue;
      if (headerKey(c.header) === h || c.aka?.some((a) => headerKey(a) === h)) {
        at.set(k, n);
        return;
      }
    }
  });
  const out: Array<{ row: number; get: (k: K) => string; raw: (k: K) => ExcelJS.CellValue }> = [];
  const last = Math.min(ws.actualRowCount + 1, ws.rowCount, MAX_ROWS + 1);
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    const raw = (k: K) => (at.has(k) ? row.getCell(at.get(k)!).value : null);
    const get = (k: K) => cellText(raw(k));
    if ([...at.keys()].every((k) => get(k) === "")) continue;
    out.push({ row: r, get, raw });
  }
  return out;
}

/** A number cell, or text such as "85,5"; "" is null, anything else undefined. */
function cellNumber(v: ExcelJS.CellValue): number | null | undefined {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in v && typeof v.result === "number") return v.result;
  const t = cellText(v).replace(/\s/g, "");
  if (t === "") return null;
  // "1,200" / "12,500,000" are thousands; any other single comma is a decimal comma ("0,5", "85,25").
  const thousands = /^-?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(t);
  const n = Number(thousands ? t.replace(/,/g, "") : /^-?\d+,\d+$/.test(t) ? t.replace(",", ".") : t);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The workbook without cell notes. exceljs cannot follow some writers' note
 * links (openpyxl's absolute "/xl/comments/…" targets); notes are not read, so
 * a workbook that fails to open is tried again without them.
 */
async function withoutComments(bytes: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(bytes);
  for (const [name, file] of Object.entries(zip.files)) {
    if (/^xl\/worksheets\/_rels\/[^/]+\.rels$/.test(name))
      zip.file(name, (await file.async("string")).replace(/<Relationship\b[^>]*relationships\/(?:comments|vmlDrawing)"[^>]*\/>/g, ""));
    else if (/^xl\/worksheets\/[^/]+\.xml$/.test(name)) zip.file(name, (await file.async("string")).replace(/<legacyDrawing\b[^>]*\/>/g, ""));
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

/** Reads a filled-in workbook into a copy of the draft. */
export async function importWorkbook(bytes: Buffer, draft: OnboardingDraft, ref: ExcelReference): Promise<{ draft: OnboardingDraft; summary: ExcelImportSummary }> {
  let wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  } catch {
    try {
      wb = new ExcelJS.Workbook();
      await wb.xlsx.load((await withoutComments(bytes)) as unknown as ArrayBuffer);
    } catch {
      throw new InputError("This file could not be opened as an Excel workbook (.xlsx).");
    }
  }
  const sheets = {
    plant: findSheet(wb, "plant"),
    areas: findSheet(wb, "areas"),
    machines: findSheet(wb, "machines"),
    parts: findSheet(wb, "parts"),
    sensors: findSheet(wb, "sensors"),
  };
  if (!Object.values(sheets).some(Boolean))
    throw new InputError(
      `This workbook has none of the sheets Plant, Areas, Machines, Parts or Sensors (it has ${wb.worksheets.map((w) => w.name).join(", ") || "no sheets"}). Download the Excel format and fill that in.`,
    );

  const d: OnboardingDraft = JSON.parse(JSON.stringify(draft));
  const s: ExcelImportSummary = { plant: false, added: { areas: 0, machines: 0, parts: 0, sensors: 0 }, updated: { areas: 0, machines: 0, parts: 0, sensors: 0 }, notes: [] };
  const note = (sheet: string, row: number, text: string) => s.notes.length < 200 && s.notes.push(`${sheet} row ${row}: ${text}`);
  const uniqueKey = (base: string, taken: (k: string) => boolean) => {
    let k = base;
    for (let n = 2; taken(k); n++) k = `${base}-${n}`;
    return k;
  };

  /* plant: Field | Value rows, or the fields as column titles with the values in row 2 */
  if (sheets.plant) {
    const ws = sheets.plant;
    const set = (label: string, value: string) => {
      const f = plantField(label);
      if (!f || value === "") return;
      if (d.plant[f.key] !== value) s.plant = true;
      d.plant[f.key] = value;
    };
    const across: Array<[number, string]> = [];
    ws.getRow(1).eachCell((c, n) => void (plantField(cellText(c.value)) && across.push([n, cellText(c.value)])));
    if (across.length >= 2) for (const [n, label] of across) set(label, cellText(ws.getRow(2).getCell(n).value));
    else ws.eachRow((row) => set(cellText(row.getCell(1).value), cellText(row.getCell(2).value)));
  }

  /* areas: names first, then where each sits */
  const areaOf = (name: string) => d.areas.find((a) => same(a.name, name));
  const addArea = (name: string): DraftArea => {
    const a: DraftArea = { key: uniqueKey(`a-${slug(name) || "area"}`, (k) => d.areas.some((x) => x.key === k)), name, parentKey: null, diagramType: null };
    d.areas.push(a);
    s.added.areas++;
    return a;
  };
  if (sheets.areas) {
    const rows = readTable(sheets.areas, AREA_COLS);
    const touched = new Set<string>();
    for (const r of rows) {
      const name = r.get("name");
      if (!name) {
        note(SHEETS.areas, r.row, "no area name, row skipped.");
        continue;
      }
      const a = areaOf(name) ?? addArea(name);
      touched.add(a.key);
    }
    for (const r of rows) {
      const a = areaOf(r.get("name"));
      const parentName = r.get("parent");
      if (!a || !parentName) continue;
      const parent = areaOf(parentName) ?? addArea(parentName);
      // An area may not end up inside itself.
      let p: DraftArea | undefined = parent;
      for (let i = 0; p && i <= d.areas.length; i++) {
        if (p.key === a.key) break;
        p = d.areas.find((x) => x.key === p!.parentKey);
      }
      if (p?.key === a.key) {
        note(SHEETS.areas, r.row, `"${a.name}" cannot sit inside "${parentName}" (that loops back to itself); left where it was.`);
        continue;
      }
      a.parentKey = parent.key;
    }
    s.updated.areas = [...touched].filter((k) => draft.areas.some((a) => a.key === k)).length;
  }

  /* machines */
  const machineOf = (ref: string) => (ref ? d.machines.find((m) => same(m.code, ref)) ?? d.machines.find((m) => same(m.name, ref)) : undefined);
  if (sheets.machines) {
    const touched = new Set<string>();
    const seen = new Map<string, number>();
    for (const r of readTable(sheets.machines, MACHINE_COLS)) {
      const code = r.get("code");
      const name = r.get("name");
      if (!code && !name) {
        note(SHEETS.machines, r.row, "no machine code or name, row skipped.");
        continue;
      }
      const id = (code || name).toLowerCase();
      if (seen.has(id)) note(SHEETS.machines, r.row, `${code || name} is also on row ${seen.get(id)}; this row's values are used.`);
      seen.set(id, r.row);
      let m = (code && d.machines.find((x) => same(x.code, code))) || (name ? d.machines.find((x) => same(x.name, name) && (!x.code || !code)) : undefined);
      if (!m) {
        m = {
          key: uniqueKey(`m-${slug(code || name) || "machine"}`, (k) => d.machines.some((x) => x.key === k)),
          code: "",
          name: "",
          areaKey: null,
          type: null,
          manufacturer: null,
          model: null,
          powerRating: null,
          operatingSpeed: null,
          criticality: "B (Essential)",
          diagramType: null,
          components: [],
          source: null,
        };
        d.machines.push(m);
        s.added.machines++;
      } else if (draft.machines.some((x) => x.key === m!.key)) touched.add(m.key);
      if (code) m.code = code;
      if (name) m.name = name;
      else m.name ||= code;
      const area = r.get("area");
      if (area) m.areaKey = (areaOf(area) ?? addArea(area)).key;
      for (const k of ["type", "manufacturer", "model", "powerRating", "operatingSpeed"] as const) {
        const v = r.get(k);
        if (v) m[k] = v;
      }
      const imp = r.get("criticality");
      if (imp) {
        const c = IMPORTANCE.find((x) => same(x, imp) || x[0] === imp.trim().toUpperCase()[0]);
        if (c) m.criticality = c;
        else note(SHEETS.machines, r.row, `importance "${imp}" is not A, B or C; kept ${m.criticality}.`);
      }
    }
    s.updated.machines = touched.size;
  }

  /* parts (also added from the Sensors sheet) */
  const touchedParts = new Set<string>();
  const partOf = (m: DraftMachine, name: string) => {
    let c = m.components.find((x) => same(x.name, name));
    if (!c) {
      c = { key: uniqueKey(`c-${slug(name) || "part"}`, (k) => m.components.some((x) => x.key === k)), name };
      m.components.push(c);
      s.added.parts++;
    } else if (draft.machines.some((dm) => dm.key === m.key && dm.components.some((x) => x.key === c!.key))) touchedParts.add(`${m.key}/${c.key}`);
    return c;
  };
  if (sheets.parts) {
    for (const r of readTable(sheets.parts, PART_COLS)) {
      const ref = r.get("machine");
      const name = r.get("name");
      if (!name) {
        note(SHEETS.parts, r.row, "no part name, row skipped.");
        continue;
      }
      const m = machineOf(ref);
      if (!m) {
        note(SHEETS.parts, r.row, ref ? `no machine with code "${ref}", part "${name}" skipped.` : `no machine code, part "${name}" skipped.`);
        continue;
      }
      partOf(m, name);
    }
  }

  /* sensors */
  if (sheets.sensors) {
    const touched = new Set<string>();
    const quantityOf = (v: string) => ref.quantities.find((q) => same(q.id, v) || same(q.name, v) || same(q.id.replace(/_/g, " "), v));
    const seen = new Map<string, number>();
    for (const r of readTable(sheets.sensors, SENSOR_COLS)) {
      const tag = r.get("tag");
      if (!tag) {
        note(SHEETS.sensors, r.row, "no tag, row skipped.");
        continue;
      }
      if (seen.has(tag.toLowerCase())) note(SHEETS.sensors, r.row, `tag ${tag} is also on row ${seen.get(tag.toLowerCase())}; this row's values are used.`);
      seen.set(tag.toLowerCase(), r.row);
      let p = d.points.find((x) => same(x.tag, tag));
      if (!p) {
        p = {
          key: uniqueKey(`p-${slug(tag) || "sensor"}`, (k) => d.points.some((x) => x.key === k)),
          tag,
          name: tag,
          machineKey: null,
          componentKey: null,
          location: null,
          quantity: null,
          unit: null,
          valueKind: "analog",
          origin: "online",
          signalType: null,
          rangeLo: null,
          rangeHi: null,
          rangeText: null,
          nominalLo: null,
          nominalHi: null,
          nominalText: null,
          ll: null,
          l: null,
          h: null,
          hh: null,
          limitsText: null,
          priority: null,
          remarks: null,
          source: null,
        };
        d.points.push(p);
        s.added.sensors++;
      } else if (draft.points.some((x) => x.key === p!.key)) touched.add(p.key);
      const point = p;

      const name = r.get("name");
      if (name) point.name = name;
      const machineRef = r.get("machine");
      const partName = r.get("part");
      if (machineRef) {
        const m = machineOf(machineRef);
        if (m) {
          point.machineKey = m.key;
          if (partName) point.componentKey = partOf(m, partName).key;
          else if (!m.components.some((c) => c.key === point.componentKey)) point.componentKey = null;
        } else note(SHEETS.sensors, r.row, `no machine with code "${machineRef}"; ${tag} is left without a machine.`);
      } else if (partName) {
        const m = d.machines.find((x) => x.key === point.machineKey);
        if (m) point.componentKey = partOf(m, partName).key;
      }
      for (const k of ["location", "unit", "signalType", "priority", "remarks"] as const) {
        const v = r.get(k);
        if (v) point[k] = v;
      }
      const kind = r.get("valueKind");
      if (kind) point.valueKind = /^(on|off|state|digital|binary|bool|yes)/i.test(kind) ? "state" : "analog";
      const origin = r.get("origin").toLowerCase();
      if (origin) point.origin = origin.startsWith("m") ? "manual" : origin.startsWith("c") ? "calculated" : "online";
      const q = r.get("quantity");
      if (q) {
        const found = quantityOf(q);
        if (found) point.quantity = found.id;
        else note(SHEETS.sensors, r.row, `"${q}" is not a measured quantity ULTRON knows; ${tag} gets a guess, check it on the Sensors step.`);
      }
      if (point.quantity === "state") point.valueKind = "state";
      if (!point.quantity || (q && !quantityOf(q))) point.quantity = guessQuantity(point.tag, point.unit, point.valueKind);
      for (const k of ["rangeLo", "rangeHi", "nominalLo", "nominalHi", "ll", "l", "h", "hh"] as const) {
        const n = cellNumber(r.raw(k));
        if (n === undefined) note(SHEETS.sensors, r.row, `${SENSOR_COLS[k].header} "${r.get(k)}" of ${tag} is not a number; left as it was.`);
        else if (n !== null) point[k] = n;
      }
    }
    s.updated.sensors = touched.size;
  }
  s.updated.parts = touchedParts.size;
  return { draft: d, summary: s };
}
