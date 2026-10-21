#!/usr/bin/env node
/**
 * Copies one machine, with all its configuration, into a new plant of its own.
 *
 *   node --env-file=.env.local scripts/clone-machine.mjs --dry-run
 *   node --env-file=.env.local scripts/clone-machine.mjs
 *
 * Built for the single-machine kiln demo: the Cement Plant's rotary kiln
 * (PYR-KLN-01) becomes DEMO-KLN-01 in plant-kdemo, and usr-kiln-demo is moved
 * onto it. Sensor tags and part codes stay the same, so the kiln's drawing,
 * value plates, part highlighting and 3D twin serve the copy unchanged; its
 * live data comes from its own simulation (engine `pyro-kln`).
 *
 * Copied: plant + plant tree + edge gateway, machine, systems, parts,
 * measurement points, measurements (limits, ranges, acquisition, states),
 * operating states (+ criteria), reference sets (+ values), rules (+ inputs,
 * parts, faults), fault library (+ inputs), investigation guides (+ items),
 * part lives, maintenance checklists and plan states, rack, edge sources /
 * cards / points, simulation binding. Runtime rows (readings, findings, health)
 * are not copied; the runner writes the copy's own.
 *
 * One transaction; --dry-run rolls back after printing the counts. Run
 * `npm run db:export-fixture` afterwards so empty databases build the copy too.
 */
import pg from "pg";
import crypto from "node:crypto";

const SRC = "PYR-KLN-01";
const NEW = "DEMO-KLN-01";
const SRC_PLANT = "plant-pyro";
const PLANT = "plant-kdemo";
const AREA = "area-kdemo";
const GATEWAY = "gw-kdemo";
const USER = "usr-kiln-demo";
const ENGINE = "pyro-kln";
const SEED = 20261022;
const DRY = process.argv.includes("--dry-run");

const db = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await db.connect();
const q = (sql, p = []) => db.query(sql, p).then((r) => r.rows);
const rid = (v) => (typeof v === "string" ? v.replaceAll(SRC, NEW) : v);
const hex = () => crypto.randomBytes(4).toString("hex");
const counts = {};

/** Inserts `row` (minus `omit` columns) into `table`; returns the stored row. */
async function put(table, row, omit = []) {
  const cols = Object.keys(row).filter((c) => !omit.includes(c));
  const vals = cols.map((c) => (row[c] !== null && typeof row[c] === "object" && !(row[c] instanceof Date) ? JSON.stringify(row[c]) : row[c]));
  const out = (await q(`INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`, vals))[0];
  counts[table] = (counts[table] ?? 0) + 1;
  return out;
}

try {
  await db.query("BEGIN");
  if ((await q("SELECT 1 FROM machines WHERE id = $1", [NEW])).length) throw new Error(`${NEW} already exists; nothing to do.`);

  /* ---------------- plant, tree, gateway ---------------- */
  const plant = (await q("SELECT * FROM plants WHERE id = $1", [SRC_PLANT]))[0];
  await put("plants", {
    ...plant,
    id: PLANT,
    code: "CEM-KDM-01",
    name: "Kiln Demo",
    short_name: "Kiln Demo",
    location: "Rotary kiln demo, Lusaka, Zambia",
    manager_user_id: null,
    primary_machine_id: null,
    description: "One rotary kiln, a copy of the Cement Plant's kiln with its own live data: drive, gearbox, girth gear, three support stations, hydraulic thrust, shell scanner, inlet and outlet.",
    design_capacity: "≈ 5,000 t/d clinker · 330 t/h kiln feed",
    sort_order: 9,
    created_at: new Date(),
    updated_at: new Date(),
  });
  const node = async (id) => (await q("SELECT * FROM hierarchy_nodes WHERE id = $1", [id]))[0];
  await put("hierarchy_nodes", { ...(await node(SRC_PLANT)), id: PLANT, plant_id: PLANT });
  await put("hierarchy_nodes", { ...(await node("area-pyro-line")), id: AREA, plant_id: PLANT, parent_id: PLANT, name: "Rotary kiln" });

  const machine = (await q("SELECT * FROM machines WHERE id = $1", [SRC]))[0];
  await put("machines", { ...machine, id: NEW, plant_id: PLANT, serial_number: machine.serial_number ? `${machine.serial_number}-D` : null, created_at: new Date(), updated_at: new Date() });
  await put("hierarchy_nodes", { ...(await node("mach-pyr-kln-01")), id: "mach-demo-kln-01", plant_id: PLANT, parent_id: AREA, machine_id: NEW });
  await q("UPDATE plants SET primary_machine_id = $2 WHERE id = $1", [PLANT, NEW]);

  const gw = (await q("SELECT * FROM edge_gateways WHERE id = 'gw-pyro-line'"))[0];
  await put("edge_gateways", {
    ...gw,
    id: GATEWAY,
    code: "ULTRON-EDGE-KILN-DEMO",
    name: "Rotary kiln edge gateway",
    site_node_id: AREA,
    location: "Kiln MCC room",
    notes: "Rotary kiln demo. Vibration on IEPE DAQ nodes; every other signal read-only from the PLC / DCS, scanner and analyser servers.",
    created_at: new Date(),
    updated_at: new Date(),
  });

  /* ---------------- structure ---------------- */
  const systems = await q("SELECT * FROM machine_systems WHERE machine_id = $1", [SRC]);
  for (const s of systems) await put("machine_systems", { ...s, id: rid(s.id), machine_id: NEW });
  const subs = await q("SELECT * FROM machine_subassemblies WHERE machine_system_ref_id = ANY($1)", [systems.map((s) => s.id)]);
  for (const s of subs) await put("machine_subassemblies", { ...s, id: rid(s.id), machine_system_ref_id: rid(s.machine_system_ref_id) });

  const pointMap = new Map();
  for (const p of await q("SELECT * FROM measurement_points WHERE subassembly_id = ANY($1)", [subs.map((s) => s.id)])) {
    const n = await put("measurement_points", { ...p, subassembly_id: rid(p.subassembly_id) }, ["id"]);
    pointMap.set(p.id, n.id);
  }
  const meas = await q("SELECT * FROM measurements WHERE point_id = ANY($1)", [[...pointMap.keys()]]);
  const measIds = new Set(meas.map((m) => m.id));
  // A reference to one of the kiln's own measurements follows the copy; one to another machine stays.
  const mid = (v) => (v && measIds.has(v) ? rid(v) : v);
  for (const m of meas) await put("measurements", { ...m, id: rid(m.id), point_id: pointMap.get(m.point_id) });
  for (const t of ["measurement_limits", "measurement_ranges", "measurement_acquisition", "measurement_states"]) {
    for (const r of await q(`SELECT * FROM ${t} WHERE measurement_id = ANY($1)`, [[...measIds]])) {
      const row = { ...r, measurement_id: rid(r.measurement_id) };
      if ("pair_measurement_id" in row) row.pair_measurement_id = mid(r.pair_measurement_id);
      if ("drive_measurement_id" in row) row.drive_measurement_id = mid(r.drive_measurement_id);
      await put(t, row);
    }
  }

  /* ---------------- operating states, references ---------------- */
  const stateMap = new Map();
  for (const s of await q("SELECT * FROM operating_states WHERE machine_id = $1", [SRC])) {
    stateMap.set(s.id, (await put("operating_states", { ...s, machine_id: NEW }, ["id"])).id);
  }
  for (const c of await q("SELECT * FROM operating_state_criteria WHERE state_id = ANY($1)", [[...stateMap.keys()]])) {
    await put("operating_state_criteria", { ...c, state_id: stateMap.get(c.state_id), measurement_id: mid(c.measurement_id) });
  }
  const refMap = new Map();
  for (const r of await q("SELECT * FROM reference_sets WHERE machine_id = $1", [SRC])) {
    refMap.set(r.id, (await put("reference_sets", { ...r, machine_id: NEW, state_id: r.state_id === null ? null : stateMap.get(r.state_id) ?? r.state_id }, ["id"])).id);
  }
  for (const v of await q("SELECT * FROM reference_values WHERE reference_set_id = ANY($1)", [[...refMap.keys()]])) {
    await put("reference_values", { ...v, reference_set_id: refMap.get(v.reference_set_id), measurement_id: mid(v.measurement_id) });
  }

  /* ---------------- faults, rules ---------------- */
  const srcRules = await q("SELECT * FROM rules WHERE machine_id = $1", [SRC]);
  const ruleIds = srcRules.map((r) => r.id);
  const faults = await q(
    "SELECT * FROM fault_library WHERE machine_id = $1 OR id IN (SELECT fault_id FROM rule_faults WHERE rule_id = ANY($2))",
    [SRC, ruleIds],
  );
  const faultMap = new Map(faults.map((f) => [f.id, `D${f.id}`.slice(0, 16)]));
  for (const f of faults) await put("fault_library", { ...f, id: faultMap.get(f.id), plant_id: PLANT, machine_id: f.machine_id === SRC ? NEW : f.machine_id });
  for (const i of await q("SELECT * FROM fault_library_inputs WHERE fault_id = ANY($1)", [[...faultMap.keys()]])) {
    await put("fault_library_inputs", { ...i, fault_id: faultMap.get(i.fault_id), measurement_id: mid(i.measurement_id) });
  }
  const ruleMap = new Map();
  for (const r of srcRules) ruleMap.set(r.id, (await put("rules", { ...r, machine_id: NEW, system_ref_id: rid(r.system_ref_id) }, ["id"])).id);
  for (const i of await q("SELECT * FROM rule_inputs WHERE rule_id = ANY($1)", [ruleIds])) {
    await put("rule_inputs", { ...i, rule_id: ruleMap.get(i.rule_id), measurement_id: mid(i.measurement_id) });
  }
  for (const s of await q("SELECT * FROM rule_subassemblies WHERE rule_id = ANY($1)", [ruleIds])) {
    await put("rule_subassemblies", { ...s, rule_id: ruleMap.get(s.rule_id), subassembly_id: rid(s.subassembly_id) });
  }
  for (const f of await q("SELECT * FROM rule_faults WHERE rule_id = ANY($1)", [ruleIds])) {
    await put("rule_faults", { ...f, rule_id: ruleMap.get(f.rule_id), fault_id: faultMap.get(f.fault_id) ?? f.fault_id });
  }

  /* ---------------- guides, part lives, maintenance ---------------- */
  const guideMap = new Map();
  for (const g of await q("SELECT * FROM investigation_guides WHERE machine_id = $1", [SRC])) {
    const id = g.id.replace(/^g-pyr-kln/, "g-dmo-kln");
    guideMap.set(g.id, id);
    await put("investigation_guides", { ...g, id, machine_id: NEW, subassembly_ref_id: rid(g.subassembly_ref_id) });
  }
  for (const i of await q("SELECT * FROM investigation_guide_items WHERE guide_id = ANY($1)", [[...guideMap.keys()]])) {
    await put("investigation_guide_items", { ...i, guide_id: guideMap.get(i.guide_id), measurement_id: mid(i.measurement_id) });
  }
  for (const l of await q("SELECT * FROM component_service_lives WHERE machine_id = $1", [SRC])) {
    await put("component_service_lives", { ...l, id: l.id.includes(SRC) ? rid(l.id) : `D${l.id}`.slice(0, 32), machine_id: NEW, subassembly_ref_id: rid(l.subassembly_ref_id) });
  }
  for (const t of ["machine_maintenance_documents", "machine_maintenance_units", "maintenance_plan_states"]) {
    for (const r of await q(`SELECT * FROM ${t} WHERE machine_id = $1`, [SRC])) await put(t, { ...r, machine_id: NEW });
  }
  for (const r of await q("SELECT * FROM rack_chassis WHERE machine_id = $1", [SRC])) {
    await put("rack_chassis", { ...r, id: "ULTRON-EDGE-DMO-KLN01", machine_id: NEW });
  }

  /* ---------------- edge registry ---------------- */
  const points = await q("SELECT * FROM edge_points WHERE measurement_id = ANY($1)", [[...measIds]]);
  const srcIds = [...new Set([...(await q("SELECT id FROM edge_sources WHERE machine_id = $1", [SRC])).map((r) => r.id), ...points.map((p) => p.source_id)])];
  const sourceMap = new Map();
  for (const s of await q("SELECT * FROM edge_sources WHERE id = ANY($1)", [srcIds])) {
    const id = `src-${hex()}`;
    sourceMap.set(s.id, id);
    await put("edge_sources", { ...s, id, gateway_id: GATEWAY, machine_id: NEW, created_at: new Date(), updated_at: new Date() });
  }
  for (const c of await q("SELECT * FROM edge_cards WHERE source_id = ANY($1)", [srcIds])) {
    await put("edge_cards", { ...c, id: `card-${hex()}`, source_id: sourceMap.get(c.source_id) });
  }
  for (const p of points) await put("edge_points", { ...p, id: `pt-${hex()}`, source_id: sourceMap.get(p.source_id), measurement_id: rid(p.measurement_id) });

  /* ---------------- simulation ---------------- */
  await q(
    `INSERT INTO simulation_engines (id, name, description) VALUES ($1, 'Kiln copy engine', 'An independent copy of the pyro line; only its rotary kiln is published, as its own machine')
     ON CONFLICT (id) DO NOTHING`,
    [ENGINE],
  );
  const sim = (await q("SELECT * FROM machine_simulations WHERE machine_id = $1", [SRC]))[0];
  await put("machine_simulations", { ...sim, machine_id: NEW, engine_id: ENGINE, seed: SEED });

  /* ---------------- the demo account ---------------- */
  await q("UPDATE user_plant_access SET plant_id = $2 WHERE user_id = $1", [USER, PLANT]);
  await q("UPDATE user_machine_access SET machine_id = $2 WHERE user_id = $1", [USER, NEW]);
  await q("UPDATE users SET default_plant_id = $2 WHERE id = $1 AND default_plant_id IS NOT NULL", [USER, PLANT]);
  await q(
    `UPDATE assetiq_questions SET params = jsonb_set(params, '{machineId}', to_jsonb($2::text))
      WHERE user_id = $1 AND params ? 'machineId'`,
    [USER, NEW],
  );
  await q(
    `UPDATE assetiq_questions SET question = 'How are the kiln inlet and its gas analysis doing?', params = jsonb_set(params, '{part}', '"kiln inlet"')
      WHERE user_id = $1 AND params->>'part' = 'inlet lamella seal'`,
    [USER],
  );
  await q(
    `UPDATE assetiq_questions SET params = jsonb_set(params, '{part}', '"station"')
      WHERE user_id = $1 AND params->>'part' = 'support station'`,
    [USER],
  );

  console.table(counts);
  if (DRY) {
    await db.query("ROLLBACK");
    console.log("Dry run: rolled back.");
  } else {
    await db.query("COMMIT");
    console.log(`Copied ${SRC} to ${NEW} in ${PLANT}; ${USER} now opens it.`);
  }
} catch (err) {
  await db.query("ROLLBACK").catch(() => undefined);
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.end();
}
