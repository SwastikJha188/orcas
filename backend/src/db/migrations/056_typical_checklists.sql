-- =============================================================================
-- 056 · Typical maintenance checklists for machines without their own
--
-- The planned Maintenance sections (Overview, Preventive, Predictive,
-- Proactive, Work orders, Calendar, Machines) need a machine's checklist
-- documents. Machines whose plant has not supplied them (the kiln-seal kilns,
-- the concentrator and hydraulics machines) get a typical checklist built
-- from their own parts and sensors:
--   · equipment: one group per sub-assembly, the standard tasks for its kind
--     of part (part_kind_tasks, below; kinds from part_kind_lives, 055)
--   · sensor: one group per sub-assembly with sensors, a live reading review
--     per measurement and a calibration check per analog one
--   · the shared "General components" section (unit GEN) as on every line.
-- Every generated task is scoped VERIFY ("confirm on the approved P&ID, OEM
-- BOM and field survey first"); a plant's own documents replace them.
-- =============================================================================

CREATE TABLE IF NOT EXISTS part_kind_tasks (
  id SERIAL PRIMARY KEY,
  kind_id VARCHAR(32) NOT NULL REFERENCES part_kind_lives(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL,
  -- "{part}" is replaced with the sub-assembly's name.
  component TEXT NOT NULL,
  check_text TEXT NOT NULL,
  pass_text TEXT NOT NULL,
  frequency VARCHAR(32) NOT NULL REFERENCES maintenance_frequencies(code),
  owner VARCHAR(8) NOT NULL REFERENCES maintenance_owners(code),
  mode VARCHAR(16) NOT NULL REFERENCES maintenance_modes(code),
  UNIQUE (kind_id, sort_order)
);

INSERT INTO part_kind_tasks (kind_id, sort_order, component, check_text, pass_text, frequency, owner, mode) VALUES
  ('lube', 1, '{part}: oil level, pressure and leaks', 'Read the oil level and supply pressure; look for leaks at the pump, filter and pipe joints.', 'Level in its normal band, pressure steady, no leaks.', 'Daily', 'OP', 'RUN'),
  ('lube', 2, '{part}: filter and oil sample', 'Read the filter differential pressure; take an oil sample for analysis.', 'Filter below its change mark; oil clean, no water or metal.', 'Monthly', 'ME', 'RUN'),
  ('lube', 3, '{part}: oil change and cooler clean', 'Drain and refill to the OEM grade and volume; clean the oil cooler.', 'Fresh oil of the right grade; cooler clean.', 'Annually', 'ME', 'Planned stop'),
  ('seal', 1, '{part}: leakage and spillage', 'Look for material, gas or liquid escaping at the seal.', 'No visible leakage or spillage.', 'Daily', 'OP', 'RUN'),
  ('seal', 2, '{part}: wear of seal elements', 'Inspect the seal faces, lamellae or packing for wear and damage.', 'Wear within limits; no torn or missing elements.', 'Monthly', 'ME', 'OFF'),
  ('bearing', 1, '{part}: temperature, noise and vibration', 'Listen for unusual noise; compare temperature and vibration with the readings in ULTRON.', 'No unusual noise; temperature and vibration in their normal bands.', 'Daily', 'OP', 'RUN'),
  ('bearing', 2, '{part}: lubrication', 'Grease or check the oil to the OEM amount and interval.', 'Lubricated to schedule; no grease pushed out of the seals.', 'Weekly', 'ME', 'RUN'),
  ('bearing', 3, '{part}: clearance and housing', 'Measure bearing clearance; check housing and foundation bolts.', 'Clearance within the OEM limit; bolts tight.', 'Annually', 'ME', 'Planned stop'),
  ('gear', 1, '{part}: noise, vibration and oil leaks', 'Listen along the drive; look for oil leaks at covers and seals.', 'Smooth running, no new noise, no oil leaks.', 'Daily', 'OP', 'RUN'),
  ('gear', 2, '{part}: vibration spectrum and oil analysis', 'Take a vibration spectrum and an oil sample.', 'No growing gear-mesh or bearing fault frequencies; oil clean.', 'Monthly', 'REL', 'RUN'),
  ('gear', 3, '{part}: tooth contact and backlash', 'Inspect tooth contact pattern and measure backlash.', 'Even contact; backlash within OEM limits; no pitting or cracks.', 'Annually', 'ME', 'Planned stop'),
  ('motor', 1, '{part}: current, temperature and noise', 'Compare current and winding temperature with ULTRON; listen for unusual noise.', 'Current and temperature in their normal bands; no unusual noise.', 'Daily', 'OP', 'RUN'),
  ('motor', 2, '{part}: terminal box, glands and earthing', 'Open the terminal box under isolation; check connections, cable glands and the earth bond.', 'No discolouration or loose connections; earth bond intact.', 'Monthly', 'EL', 'OFF'),
  ('motor', 3, '{part}: insulation resistance', 'Measure insulation resistance and compare with the last test.', 'Above the OEM minimum and no sharp drop since the last test.', 'Annually', 'EL', 'OFF'),
  ('fan', 1, '{part}: vibration and noise', 'Compare vibration with ULTRON; listen for rubbing or new noise.', 'Vibration in its normal band; no rubbing.', 'Daily', 'OP', 'RUN'),
  ('fan', 2, '{part}: impeller build-up and wear', 'Inspect the impeller and casing for build-up, erosion and cracks.', 'Impeller clean, no build-up, erosion or cracks.', 'Monthly', 'ME', 'OFF'),
  ('pump', 1, '{part}: pressure, flow and leaks', 'Read discharge pressure and flow; look for leaks at the seal and flanges.', 'At its duty point; no leaks.', 'Daily', 'OP', 'RUN'),
  ('pump', 2, '{part}: vibration and seal flush', 'Take vibration readings; check the seal flush or gland water.', 'Vibration normal; flush flowing.', 'Monthly', 'REL', 'RUN'),
  ('pump', 3, '{part}: impeller, valves and liners', 'Inspect wetted parts for wear.', 'Wear within limits; no cavitation damage.', 'Annually', 'ME', 'OFF'),
  ('actuator', 1, '{part}: stroke, response and leaks', 'Run a full stroke; look for hydraulic or air leaks.', 'Full stroke without sticking; no leaks.', 'Weekly', 'OP', 'RUN'),
  ('actuator', 2, '{part}: position feedback', 'Check the position reading at 0, 50 and 100 % travel.', 'Reading matches the travel at each point.', 'Quarterly', 'IN', 'OFF'),
  ('filter', 1, '{part}: differential pressure', 'Read the differential pressure across the filter.', 'In its normal band.', 'Daily', 'OP', 'RUN'),
  ('filter', 2, '{part}: bags or elements', 'Inspect bags or elements; test the cleaning pulses.', 'No torn bags or holes; cleaning pulses working.', 'Monthly', 'ME', 'OFF'),
  ('conveying', 1, '{part}: tracking, spillage and load', 'Watch the conveyor run; look for spillage and slipping.', 'Running centred, no spillage, no slipping.', 'Daily', 'OP', 'RUN'),
  ('conveying', 2, '{part}: wear of belt, chain, idlers and scrapers', 'Inspect wear parts under isolation.', 'Wear within limits; scrapers in contact.', 'Weekly', 'ME', 'OFF'),
  ('conveying', 3, '{part}: splices, joints and pulley lagging', 'Inspect splices or chain joints and the pulley lagging.', 'Splices sound; lagging intact.', 'Quarterly', 'ME', 'Planned stop'),
  ('wear', 1, '{part}: hot spots and wear signs', 'Look for hot spots on the shell or casing and for new noise.', 'No hot spots; no new noise.', 'Daily', 'OP', 'RUN'),
  ('wear', 2, '{part}: wear trend', 'Measure wear or thickness and compare with the last measurement.', 'Wear rate in line with the expected life.', 'Monthly', 'REL', 'RUN'),
  ('wear', 3, '{part}: lining and wear parts', 'Inspect the lining or wear parts and plan replacements.', 'Thickness above the replacement limit.', 'Annually', 'ME', 'Planned stop'),
  ('electrical', 1, '{part}: temperatures and cooling', 'Check cabinet and part temperatures and the cooling flow.', 'Temperatures normal; cooling flowing.', 'Weekly', 'EL', 'RUN'),
  ('electrical', 2, '{part}: connections and insulation', 'Check connections and insulation under isolation.', 'No discolouration, loose connections or insulation damage.', 'Quarterly', 'EL', 'OFF'),
  ('instrument', 1, '{part}: reading plausibility', 'Compare the reading with related readings in ULTRON.', 'Reading agrees with related readings; no flat line or spikes.', 'Weekly', 'IN', 'RUN'),
  ('instrument', 2, '{part}: calibration', 'Check the instrument at its calibration points.', 'Within the stated accuracy at each point.', 'O / OEM', 'IN', 'OFF'),
  ('process', 1, '{part}: flows, temperatures and leaks', 'Compare flows and temperatures with ULTRON; look for leaks.', 'In their normal bands; no leaks.', 'Daily', 'OP', 'RUN'),
  ('process', 2, '{part}: build-up and blockages', 'Inspect for build-up and blockages.', 'Clear passages; no build-up.', 'Monthly', 'ME', 'Planned stop'),
  ('structure', 1, '{part}: cracks, corrosion and loose bolts', 'Walk round the structure; look for cracks, corrosion and loose bolts.', 'No cracks, heavy corrosion or loose bolts.', 'Monthly', 'OP', 'RUN'),
  ('structure', 2, '{part}: structural inspection', 'Inspect welds, supports and alignment.', 'Sound welds and supports; alignment within limits.', 'Annually', 'ME', 'Planned stop'),
  ('other', 1, '{part}: condition walk-round', 'Look, listen and compare readings with ULTRON.', 'Nothing unusual.', 'Weekly', 'OP', 'RUN')
ON CONFLICT (kind_id, sort_order) DO NOTHING;

DO $$
DECLARE
  m RECORD;
  sa RECORD;
  ms RECORD;
  t RECORD;
  eq_doc INT;
  sn_doc INT;
  eq_unit INT;
  sn_unit INT;
  grp INT;
  task INT;
  n_group INT;
  n_task INT;
  gen_unit INT := (SELECT u.id FROM maintenance_units u JOIN maintenance_documents d ON d.id = u.document_id WHERE u.code = 'GEN' AND d.kind = 'equipment' ORDER BY u.id LIMIT 1);
BEGIN
  FOR m IN SELECT id, code, name FROM machines WHERE id NOT IN (SELECT machine_id FROM machine_maintenance_documents) AND EXISTS (
             SELECT 1 FROM machine_systems sy JOIN machine_subassemblies x ON x.machine_system_ref_id = sy.id WHERE sy.machine_id = machines.id)
           ORDER BY id LOOP
    INSERT INTO maintenance_documents (kind, number, revision, title, issued, status)
      VALUES ('equipment', 'OSW-PE-MNT-' || m.code, 'Rev. 00', m.name || ' Machine & Equipment Maintenance Checklist', '22 Oct 2026', 'Typical tasks for each kind of part – confirm with the OEM manual')
      RETURNING id INTO eq_doc;
    INSERT INTO maintenance_documents (kind, number, revision, title, issued, status)
      VALUES ('sensor', 'OSW-PE-SMT-' || m.code, 'Rev. 00', m.name || ' Sensor & Instrument Maintenance Checklist', '22 Oct 2026', 'Typical tasks for each sensor – confirm with the OEM manual')
      RETURNING id INTO sn_doc;
    INSERT INTO maintenance_units (document_id, code, title, conditional, sort_order) VALUES (eq_doc, m.code, m.name, false, 1) RETURNING id INTO eq_unit;
    INSERT INTO maintenance_units (document_id, code, title, conditional, sort_order) VALUES (sn_doc, m.code, m.name || ' — Sensors & Instrumentation', false, 1) RETURNING id INTO sn_unit;
    INSERT INTO machine_maintenance_documents (machine_id, kind, document_id) VALUES (m.id, 'equipment', eq_doc), (m.id, 'sensor', sn_doc);
    IF gen_unit IS NOT NULL THEN
      INSERT INTO machine_maintenance_units (machine_id, unit_id, sort_order) VALUES (m.id, gen_unit, 0);
    END IF;
    INSERT INTO machine_maintenance_units (machine_id, unit_id, sort_order) VALUES (m.id, eq_unit, 1), (m.id, sn_unit, 100);

    -- Equipment: one group per sub-assembly, the standard tasks of its kind of part.
    n_group := 0;
    n_task := 0;
    FOR sa IN
      SELECT x.id, x.name, k.id AS kind
        FROM machine_systems sy JOIN machine_subassemblies x ON x.machine_system_ref_id = sy.id
        CROSS JOIN LATERAL (SELECT id FROM part_kind_lives WHERE x.name ~* name_pattern ORDER BY sort_order LIMIT 1) k
       WHERE sy.machine_id = m.id ORDER BY sy.sort_order, x.sort_order LOOP
      n_group := n_group + 1;
      INSERT INTO maintenance_groups (unit_id, num, title, sort_order) VALUES (eq_unit, '1.' || n_group, sa.name, n_group) RETURNING id INTO grp;
      FOR t IN SELECT * FROM part_kind_tasks WHERE kind_id = sa.kind ORDER BY sort_order LOOP
        n_task := n_task + 1;
        INSERT INTO maintenance_tasks (group_id, code, tag, component, priority, pass_text, frequency, owner, mode, scope, sort_order)
          VALUES (grp, m.code || '-EQ-' || lpad(n_task::text, 3, '0'), NULL, replace(t.component, '{part}', sa.name), NULL, t.pass_text, t.frequency, t.owner, t.mode, 'VERIFY', n_task)
          RETURNING id INTO task;
        INSERT INTO maintenance_task_steps (task_id, step_no, label, text) VALUES (task, 1, NULL, t.check_text);
      END LOOP;
    END LOOP;

    -- Sensors: one group per sub-assembly with measurements; a live review each, a calibration check per analog one.
    n_group := 0;
    n_task := 0;
    FOR sa IN
      SELECT DISTINCT c.subassembly_id, c.subassembly_name, x.sort_order AS so
        FROM v_measurement_context c JOIN machine_subassemblies x ON x.id = c.subassembly_id
       WHERE c.machine_id = m.id ORDER BY x.sort_order LOOP
      n_group := n_group + 1;
      INSERT INTO maintenance_groups (unit_id, num, title, sort_order) VALUES (sn_unit, '2.' || n_group, sa.subassembly_name, n_group) RETURNING id INTO grp;
      FOR ms IN SELECT tag, name, value_kind FROM v_measurement_context WHERE machine_id = m.id AND subassembly_id = sa.subassembly_id ORDER BY sort_order, tag LOOP
        n_task := n_task + 1;
        INSERT INTO maintenance_tasks (group_id, code, tag, component, priority, pass_text, frequency, owner, mode, scope, sort_order)
          VALUES (grp, m.code || '-IN-' || lpad(n_task::text, 3, '0'), ms.tag, ms.name || ': reading in ULTRON', NULL, 'Reading live and plausible, within its range; no flat line or spikes.', 'AUTO / SHIFT', 'IN', 'RUN', 'DCS DATA', n_task)
          RETURNING id INTO task;
        INSERT INTO maintenance_task_steps (task_id, step_no, label, text) VALUES (task, 1, NULL, 'Review the reading and its last hours in ULTRON; compare with related readings.');
        IF ms.value_kind IS DISTINCT FROM 'state' THEN
          n_task := n_task + 1;
          INSERT INTO maintenance_tasks (group_id, code, tag, component, priority, pass_text, frequency, owner, mode, scope, sort_order)
            VALUES (grp, m.code || '-IN-' || lpad(n_task::text, 3, '0'), ms.tag, ms.name || ': calibration', NULL, 'Within the instrument''s stated accuracy at each check point.', 'O / OEM', 'IN', 'OFF', 'VERIFY', n_task)
            RETURNING id INTO task;
          INSERT INTO maintenance_task_steps (task_id, step_no, label, text) VALUES (task, 1, NULL, 'Check the sensor against a reference at its calibration points.');
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
