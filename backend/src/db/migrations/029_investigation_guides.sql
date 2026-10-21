-- =============================================================================
-- 029 · Investigation guides: starting points for a case, per machine
--
-- Each guide starts from what a person notices on one machine (and, where it
-- is about one part, that part) and lists, in everyday words
-- (docs/plain-language.md):
--   reading  readings to look at first (linked to the machine's measurement)
--   check    checks to do on site or in the data
--   cause    causes it might be
-- Six pyro-line machines get 3–4 guides each; the rotary kilns KLN-01..03 and
-- the vacuum casting machines VPC-066..068 get 2 each. Re-runnable: rows that
-- already exist are left as they are.
-- =============================================================================

-- PYR-FED-01 · Feed elevator slowing down or stopping
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-fed-elevator-stall', 'PYR-FED-01', 'PYR-FED-01-kfs-elevator', 'Feed elevator slowing down or stopping', 'The bucket elevator that lifts raw material up to the preheater is turning slower than usual, or its motor is working harder while it moves less material.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-fed-elevator-stall', 'reading', 1, 'Elevator speed', 'PYR-FED-01-SPD-KFS-01'),
  ('g-pyr-fed-elevator-stall', 'reading', 2, 'Elevator motor current', 'PYR-FED-01-ELE-KFS-01'),
  ('g-pyr-fed-elevator-stall', 'reading', 3, 'Material piling up at the bottom of the elevator', 'PYR-FED-01-LEV-KFS-04'),
  ('g-pyr-fed-elevator-stall', 'reading', 4, 'Elevator belt running off line', 'PYR-FED-01-LIM-KFS-01'),
  ('g-pyr-fed-elevator-stall', 'reading', 5, 'Kiln feed flow through meter A', 'PYR-FED-01-FLO-KFS-01'),
  ('g-pyr-fed-elevator-stall', 'check', 1, 'Look at the bottom of the elevator for spilled or piled-up material', NULL),
  ('g-pyr-fed-elevator-stall', 'check', 2, 'Check the belt tension and the top pulley for wear and slipping', NULL),
  ('g-pyr-fed-elevator-stall', 'check', 3, 'Check the speed sensor is mounted firmly and its target is clean', NULL),
  ('g-pyr-fed-elevator-stall', 'check', 4, 'Compare the elevator speed with the kiln feed flow over the last hour', NULL),
  ('g-pyr-fed-elevator-stall', 'cause', 1, 'Too much material at the bottom of the elevator, jamming it', NULL),
  ('g-pyr-fed-elevator-stall', 'cause', 2, 'The belt slipping on a worn top pulley', NULL),
  ('g-pyr-fed-elevator-stall', 'cause', 3, 'A broken or badly stretched belt or chain', NULL),
  ('g-pyr-fed-elevator-stall', 'cause', 4, 'A faulty speed sensor', NULL)
ON CONFLICT DO NOTHING;

-- PYR-FED-01 · Feed elevator drive running hot or shaking
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-fed-elevator-drive', 'PYR-FED-01', 'PYR-FED-01-kfs-elevator', 'Feed elevator drive running hot or shaking', 'The drive at the top of the bucket elevator (lifts raw material up to the preheater) is heating up or vibrating more than usual.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-fed-elevator-drive', 'reading', 1, 'Elevator drive vibration', 'PYR-FED-01-VIB-KFS-01'),
  ('g-pyr-fed-elevator-drive', 'reading', 2, 'Elevator drive bearing temperature', 'PYR-FED-01-TMP-KFS-01'),
  ('g-pyr-fed-elevator-drive', 'reading', 3, 'Elevator motor winding temperature', 'PYR-FED-01-TMP-KFS-02'),
  ('g-pyr-fed-elevator-drive', 'reading', 4, 'Elevator motor current', 'PYR-FED-01-ELE-KFS-01'),
  ('g-pyr-fed-elevator-drive', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-pyr-fed-elevator-drive', 'check', 2, 'Check the bearing grease and the gearbox oil level', NULL),
  ('g-pyr-fed-elevator-drive', 'check', 3, 'Check the motor and gearbox are in line and their bolts are tight', NULL),
  ('g-pyr-fed-elevator-drive', 'check', 4, 'Take a detailed vibration measurement while the elevator runs at its normal load', NULL),
  ('g-pyr-fed-elevator-drive', 'cause', 1, 'Bearing wearing out or short of grease', NULL),
  ('g-pyr-fed-elevator-drive', 'cause', 2, 'Worn gear teeth in the drive gearbox', NULL),
  ('g-pyr-fed-elevator-drive', 'cause', 3, 'Motor and gearbox out of line', NULL),
  ('g-pyr-fed-elevator-drive', 'cause', 4, 'Loose mounting or a sensor problem', NULL)
ON CONFLICT DO NOTHING;

-- PYR-FED-01 · Raw meal not flowing out of the feed silo
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-fed-silo-flow', 'PYR-FED-01', 'PYR-FED-01-fsl-silo', 'Raw meal not flowing out of the feed silo', 'The feed silo is not emptying as it should: its level stays the same or the kiln feed bin runs low while the kiln is being fed.', 3)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-fed-silo-flow', 'reading', 1, 'Feed silo level', 'PYR-FED-01-LEV-FSL-01'),
  ('g-pyr-fed-silo-flow', 'reading', 2, 'Air pressure under the silo floor', 'PYR-FED-01-PRS-FSL-01'),
  ('g-pyr-fed-silo-flow', 'reading', 3, 'Silo air blower motor current', 'PYR-FED-01-ELE-FSL-01'),
  ('g-pyr-fed-silo-flow', 'reading', 4, 'Silo outlet gate 1 open or closed', 'PYR-FED-01-POS-FSL-01'),
  ('g-pyr-fed-silo-flow', 'reading', 5, 'Kiln feed bin weight', 'PYR-FED-01-WGT-KFS-01'),
  ('g-pyr-fed-silo-flow', 'check', 1, 'Check that the silo outlet gates open and close fully', NULL),
  ('g-pyr-fed-silo-flow', 'check', 2, 'Check the silo air blower is running and the air pressure under the floor is normal', NULL),
  ('g-pyr-fed-silo-flow', 'check', 3, 'Check the silo level gauge is not stuck on a false reading', NULL),
  ('g-pyr-fed-silo-flow', 'check', 4, 'Take a sample of the raw meal and check it for moisture', NULL),
  ('g-pyr-fed-silo-flow', 'cause', 1, 'Raw meal packed hard over the silo outlet', NULL),
  ('g-pyr-fed-silo-flow', 'cause', 2, 'Too little air from the silo blower to loosen the meal', NULL),
  ('g-pyr-fed-silo-flow', 'cause', 3, 'Clogged or torn air pads in the silo floor', NULL),
  ('g-pyr-fed-silo-flow', 'cause', 4, 'An outlet gate stuck, or its actuator short of air', NULL),
  ('g-pyr-fed-silo-flow', 'cause', 5, 'Damp raw meal sticking together', NULL)
ON CONFLICT DO NOTHING;

-- PYR-FED-01 · Kiln feed rate unsteady or the feed meters disagree
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-fed-feed-unsteady', 'PYR-FED-01', 'PYR-FED-01-kfs-sfm', 'Kiln feed rate unsteady or the feed meters disagree', 'The amount of raw meal going to the kiln jumps up and down, or the two feed flow meters show different amounts.', 4)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-fed-feed-unsteady', 'reading', 1, 'Kiln feed flow through meter A', 'PYR-FED-01-FLO-KFS-01'),
  ('g-pyr-fed-feed-unsteady', 'reading', 2, 'Kiln feed flow through meter B', 'PYR-FED-01-FLO-KFS-02'),
  ('g-pyr-fed-feed-unsteady', 'reading', 3, 'Air pressure at feed meter A', 'PYR-FED-01-PRS-KFS-02'),
  ('g-pyr-fed-feed-unsteady', 'reading', 4, 'Air pressure at feed meter B', 'PYR-FED-01-PRS-KFS-06'),
  ('g-pyr-fed-feed-unsteady', 'reading', 5, 'Kiln feed bin weight', 'PYR-FED-01-WGT-KFS-01'),
  ('g-pyr-fed-feed-unsteady', 'check', 1, 'Compare both feed meters with how fast the feed bin weight drops', NULL),
  ('g-pyr-fed-feed-unsteady', 'check', 2, 'Check the meter plates for raw meal build-up', NULL),
  ('g-pyr-fed-feed-unsteady', 'check', 3, 'Check the cloth in the air-fed chutes under the bin for tears', NULL),
  ('g-pyr-fed-feed-unsteady', 'check', 4, 'Check the bin outlet gates are not opening and closing on their own', NULL),
  ('g-pyr-fed-feed-unsteady', 'cause', 1, 'Air blowing back through a meter and upsetting its reading', NULL),
  ('g-pyr-fed-feed-unsteady', 'cause', 2, 'Raw meal building up on a meter plate', NULL),
  ('g-pyr-fed-feed-unsteady', 'cause', 3, 'A torn cloth in an air-fed chute', NULL),
  ('g-pyr-fed-feed-unsteady', 'cause', 4, 'Damp raw meal forming bridges in the feed bin', NULL),
  ('g-pyr-fed-feed-unsteady', 'cause', 5, 'A feed meter that has drifted out of calibration', NULL)
ON CONFLICT DO NOTHING;

-- PYR-PHC-01 · Exhaust fan running hot or shaking
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-phc-fan-heat', 'PYR-PHC-01', 'PYR-PHC-01-phc-idfan', 'Exhaust fan running hot or shaking', 'The exhaust fan that pulls hot gas through the kiln and preheater has a bearing heating up or is vibrating more than usual.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-phc-fan-heat', 'reading', 1, 'Exhaust fan vibration at the drive end', 'PYR-PHC-01-VIB-PHC-01'),
  ('g-pyr-phc-fan-heat', 'reading', 2, 'Exhaust fan vibration at the far end', 'PYR-PHC-01-VIB-PHC-02'),
  ('g-pyr-phc-fan-heat', 'reading', 3, 'Exhaust fan bearing temperature at the drive end', 'PYR-PHC-01-TMP-PHC-09'),
  ('g-pyr-phc-fan-heat', 'reading', 4, 'Exhaust fan bearing temperature at the far end', 'PYR-PHC-01-TMP-PHC-10'),
  ('g-pyr-phc-fan-heat', 'reading', 5, 'Exhaust fan speed', 'PYR-PHC-01-SPD-PHC-01'),
  ('g-pyr-phc-fan-heat', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-pyr-phc-fan-heat', 'check', 2, 'Check the bearing grease or oil and the bearing cooling', NULL),
  ('g-pyr-phc-fan-heat', 'check', 3, 'At the next stop, look at the fan blades for dust build-up or uneven wear', NULL),
  ('g-pyr-phc-fan-heat', 'check', 4, 'Take a detailed vibration measurement while the fan runs at its normal speed', NULL),
  ('g-pyr-phc-fan-heat', 'cause', 1, 'Bearing wearing out or short of grease', NULL),
  ('g-pyr-phc-fan-heat', 'cause', 2, 'Dust build-up on the fan blades making it unbalanced', NULL),
  ('g-pyr-phc-fan-heat', 'cause', 3, 'Uneven wear on the fan blades', NULL),
  ('g-pyr-phc-fan-heat', 'cause', 4, 'Loose mounting or a sensor problem', NULL),
  ('g-pyr-phc-fan-heat', 'cause', 5, 'The fan is being run harder than usual', NULL)
ON CONFLICT DO NOTHING;

-- PYR-PHC-01 · Lower preheater cyclone blocking up
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-phc-cyclone-block', 'PYR-PHC-01', 'PYR-PHC-01-phc-lower', 'Lower preheater cyclone blocking up', 'Raw meal may be building up in one of the lower cyclones (the hottest stages of the preheater tower). The pressure in its cone changes and hot meal stops flowing down to the kiln.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-phc-cyclone-block', 'reading', 1, 'Pressure in the cone of cyclone 4', 'PYR-PHC-01-PRS-PHC-07'),
  ('g-pyr-phc-cyclone-block', 'reading', 2, 'Pressure in the cone of cyclone 5', 'PYR-PHC-01-PRS-PHC-08'),
  ('g-pyr-phc-cyclone-block', 'reading', 3, 'Pressure in the cone of cyclone 6', 'PYR-PHC-01-PRS-PHC-09'),
  ('g-pyr-phc-cyclone-block', 'reading', 4, 'Gas temperature leaving cyclone 5', 'PYR-PHC-01-TMP-PHC-05'),
  ('g-pyr-phc-cyclone-block', 'reading', 5, 'Gas temperature leaving cyclone 6', 'PYR-PHC-01-TMP-PHC-06'),
  ('g-pyr-phc-cyclone-block', 'check', 1, 'Check the purge air on the cone pressure points is flowing, so the reading is real', NULL),
  ('g-pyr-phc-cyclone-block', 'check', 2, 'Look through the inspection ports for build-up in the cyclone cone and outlet', NULL),
  ('g-pyr-phc-cyclone-block', 'check', 3, 'Check the flap valve under the cyclone moves freely', NULL),
  ('g-pyr-phc-cyclone-block', 'check', 4, 'Check the raw meal for extra sulphur or alkali in the latest lab result', NULL),
  ('g-pyr-phc-cyclone-block', 'cause', 1, 'Sticky meal coating the cyclone cone or outlet', NULL),
  ('g-pyr-phc-cyclone-block', 'cause', 2, 'A flap valve under the cyclone stuck shut', NULL),
  ('g-pyr-phc-cyclone-block', 'cause', 3, 'Blocked pressure point because the purge air has stopped', NULL),
  ('g-pyr-phc-cyclone-block', 'cause', 4, 'Too much sulphur or alkali in the raw meal making it sticky', NULL)
ON CONFLICT DO NOTHING;

-- PYR-PHC-01 · Outside air leaking into the preheater
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-phc-false-air', 'PYR-PHC-01', 'PYR-PHC-01-phc-exitgas', 'Outside air leaking into the preheater', 'There is more oxygen at the top of the preheater than lower down, so outside air may be getting in. The exhaust fan then has to work harder and fuel is wasted.', 3)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-phc-false-air', 'reading', 1, 'Rise in oxygen from the bottom to the top of the preheater', 'PYR-PHC-01-CAL-PHC-01'),
  ('g-pyr-phc-false-air', 'reading', 2, 'Oxygen at the preheater exit', 'PYR-PHC-01-GAS-PHC-01'),
  ('g-pyr-phc-false-air', 'reading', 3, 'Oxygen at the calciner outlet', 'PYR-PHC-01-GAS-PHC-03'),
  ('g-pyr-phc-false-air', 'reading', 4, 'Exhaust fan power', 'PYR-PHC-01-ELE-PHC-01'),
  ('g-pyr-phc-false-air', 'reading', 5, 'Suction at the preheater exit', 'PYR-PHC-01-PRS-PHC-01'),
  ('g-pyr-phc-false-air', 'check', 1, 'Walk the preheater tower and check every inspection door is closed and sealed', NULL),
  ('g-pyr-phc-false-air', 'check', 2, 'Check the flap valves and duct joints in the upper stages for leaks', NULL),
  ('g-pyr-phc-false-air', 'check', 3, 'Check both oxygen analysers with calibration gas', NULL),
  ('g-pyr-phc-false-air', 'cause', 1, 'An inspection door left open or badly sealed', NULL),
  ('g-pyr-phc-false-air', 'cause', 2, 'A worn flap valve letting air through', NULL),
  ('g-pyr-phc-false-air', 'cause', 3, 'A crack in a duct or a leaking duct joint', NULL),
  ('g-pyr-phc-false-air', 'cause', 4, 'One oxygen analyser drifting and reading wrong', NULL)
ON CONFLICT DO NOTHING;

-- PYR-PHC-01 · Fuel not burning completely in the calciner
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-phc-combustion', 'PYR-PHC-01', 'PYR-PHC-01-phc-calciner', 'Fuel not burning completely in the calciner', 'Carbon monoxide (CO) is rising at the calciner outlet or the preheater exit, so some fuel is not burning fully. This wastes fuel and can make the exhaust gas unsafe.', 4)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-phc-combustion', 'reading', 1, 'Carbon monoxide at the calciner outlet', 'PYR-PHC-01-GAS-PHC-04'),
  ('g-pyr-phc-combustion', 'reading', 2, 'Oxygen at the calciner outlet', 'PYR-PHC-01-GAS-PHC-03'),
  ('g-pyr-phc-combustion', 'reading', 3, 'Carbon monoxide at the preheater exit', 'PYR-PHC-01-GAS-PHC-02'),
  ('g-pyr-phc-combustion', 'reading', 4, 'Gas temperature at the calciner outlet', 'PYR-PHC-01-TMP-PHC-08'),
  ('g-pyr-phc-combustion', 'reading', 5, 'Exhaust fan inlet damper opening', 'PYR-PHC-01-POS-PHC-01'),
  ('g-pyr-phc-combustion', 'check', 1, 'Compare the air and fuel rates with the last period of steady running', NULL),
  ('g-pyr-phc-combustion', 'check', 2, 'Check how fine the coal is in the latest lab result', NULL),
  ('g-pyr-phc-combustion', 'check', 3, 'Check the gas analyser sample line and filter for leaks and blockage', NULL),
  ('g-pyr-phc-combustion', 'check', 4, 'Check the damper on the hot air duct from the cooler is set as expected', NULL),
  ('g-pyr-phc-combustion', 'cause', 1, 'Too little air for the amount of fuel', NULL),
  ('g-pyr-phc-combustion', 'cause', 2, 'Coal ground too coarse to burn fully', NULL),
  ('g-pyr-phc-combustion', 'cause', 3, 'Fuel and hot air not mixing well in the calciner', NULL),
  ('g-pyr-phc-combustion', 'cause', 4, 'A leaking or blocked gas analyser sample line', NULL)
ON CONFLICT DO NOTHING;

-- PYR-KLN-01 · Hot spot on the kiln shell
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-kln-shell-hot', 'PYR-KLN-01', 'PYR-KLN-01-kln-shell', 'Hot spot on the kiln shell', 'Part of the kiln''s steel shell is hotter than the rest. The brick lining or the protective coating inside may be missing there, and the steel can be damaged if it stays hot.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-kln-shell-hot', 'reading', 1, 'Hottest point on the kiln shell', 'PYR-KLN-01-CAL-KLN-03'),
  ('g-pyr-kln-shell-hot', 'reading', 2, 'How much of the shell the temperature scanner can see', 'PYR-KLN-01-STS-KLN-08'),
  ('g-pyr-kln-shell-hot', 'reading', 3, 'Handheld shell temperature check', 'PYR-KLN-01-MAN-KLN-01'),
  ('g-pyr-kln-shell-hot', 'reading', 4, 'Burning zone temperature', 'PYR-KLN-01-TMP-KLN-14'),
  ('g-pyr-kln-shell-hot', 'reading', 5, 'Shell cooling fans running', 'PYR-KLN-01-STS-KLN-13'),
  ('g-pyr-kln-shell-hot', 'check', 1, 'Measure the spot with a handheld thermometer to confirm the scanner reading', NULL),
  ('g-pyr-kln-shell-hot', 'check', 2, 'Clean the scanner window and check nothing blocks its view of the shell', NULL),
  ('g-pyr-kln-shell-hot', 'check', 3, 'Check the shell cooling fans aimed at the spot are running', NULL),
  ('g-pyr-kln-shell-hot', 'check', 4, 'Mark the spot and follow its temperature every hour', NULL),
  ('g-pyr-kln-shell-hot', 'cause', 1, 'Lining bricks broken or fallen out', NULL),
  ('g-pyr-kln-shell-hot', 'cause', 2, 'Protective coating fallen off inside the kiln', NULL),
  ('g-pyr-kln-shell-hot', 'cause', 3, 'Flame too long or hitting the lining', NULL),
  ('g-pyr-kln-shell-hot', 'cause', 4, 'A dirty scanner window giving a false reading', NULL)
ON CONFLICT DO NOTHING;

-- PYR-KLN-01 · Kiln support roller bearing running hot
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-kln-roller-heat', 'PYR-KLN-01', NULL, 'Kiln support roller bearing running hot', 'A bearing on one of the rollers that carry the kiln is getting hotter than the others. It may be short of oil or cooling, or the roller may be carrying too much load.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-kln-roller-heat', 'reading', 1, 'Station 1 left roller bearing temperature', 'PYR-KLN-01-TMP-KLN-01'),
  ('g-pyr-kln-roller-heat', 'reading', 2, 'Station 2 left roller bearing temperature', 'PYR-KLN-01-TMP-KLN-05'),
  ('g-pyr-kln-roller-heat', 'reading', 3, 'Station 3 left roller bearing temperature', 'PYR-KLN-01-TMP-KLN-09'),
  ('g-pyr-kln-roller-heat', 'reading', 4, 'Station 2 left roller oil level', 'PYR-KLN-01-LEV-KLN-04'),
  ('g-pyr-kln-roller-heat', 'reading', 5, 'Kiln position along its length', 'PYR-KLN-01-POS-KLN-01'),
  ('g-pyr-kln-roller-heat', 'check', 1, 'Check the oil level and look for oil leaks at the hot bearing', NULL),
  ('g-pyr-kln-roller-heat', 'check', 2, 'Check the cooling water to the hot bearing is flowing', NULL),
  ('g-pyr-kln-roller-heat', 'check', 3, 'Check the roller surface and the tyre for marks that show the roller is set at an angle', NULL),
  ('g-pyr-kln-roller-heat', 'check', 4, 'Compare the hot bearing with the other bearing on the same roller', NULL),
  ('g-pyr-kln-roller-heat', 'cause', 1, 'Oil level low or an oil leak at the bearing', NULL),
  ('g-pyr-kln-roller-heat', 'cause', 2, 'Cooling water to the bearing lost', NULL),
  ('g-pyr-kln-roller-heat', 'cause', 3, 'Roller set at an angle and pushing the kiln', NULL),
  ('g-pyr-kln-roller-heat', 'cause', 4, 'Too much of the kiln''s weight on one station', NULL),
  ('g-pyr-kln-roller-heat', 'cause', 5, 'A sensor problem', NULL)
ON CONFLICT DO NOTHING;

-- PYR-KLN-01 · Kiln drive working harder than usual
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-kln-drive-load', 'PYR-KLN-01', 'PYR-KLN-01-kln-motor', 'Kiln drive working harder than usual', 'The main kiln motor needs more power than usual to turn the kiln at the same speed. Something may be rubbing or dragging, or material may be building up inside.', 3)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-kln-drive-load', 'reading', 1, 'Main kiln motor load', 'PYR-KLN-01-ELE-KLN-01'),
  ('g-pyr-kln-drive-load', 'reading', 2, 'Kiln speed', 'PYR-KLN-01-SPD-KLN-01'),
  ('g-pyr-kln-drive-load', 'reading', 3, 'Main kiln motor winding temperature', 'PYR-KLN-01-TMP-KLN-21'),
  ('g-pyr-kln-drive-load', 'reading', 4, 'Gearbox output vibration', 'PYR-KLN-01-VIB-KLN-03'),
  ('g-pyr-kln-drive-load', 'reading', 5, 'Kiln position along its length', 'PYR-KLN-01-POS-KLN-01'),
  ('g-pyr-kln-drive-load', 'check', 1, 'Walk the kiln and listen for rubbing at the seals, tyres and rollers', NULL),
  ('g-pyr-kln-drive-load', 'check', 2, 'Check the brake on the backup drive is fully released', NULL),
  ('g-pyr-kln-drive-load', 'check', 3, 'Check the support rollers for dry running or being set at an angle', NULL),
  ('g-pyr-kln-drive-load', 'check', 4, 'Compare the motor load with the feed rate and the shell temperatures', NULL),
  ('g-pyr-kln-drive-load', 'cause', 1, 'A seal or tyre rubbing', NULL),
  ('g-pyr-kln-drive-load', 'cause', 2, 'A support roller dragging or set at an angle', NULL),
  ('g-pyr-kln-drive-load', 'cause', 3, 'A ring of material building up inside the kiln', NULL),
  ('g-pyr-kln-drive-load', 'cause', 4, 'The backup drive brake not fully released', NULL)
ON CONFLICT DO NOTHING;

-- PYR-KLN-01 · Kiln ring gear and its drive gear wearing
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-kln-gear-wear', 'PYR-KLN-01', 'PYR-KLN-01-kln-girth', 'Kiln ring gear and its drive gear wearing', 'The small drive gear that turns the big ring gear around the kiln is vibrating more than usual. The gear teeth may be wearing or not getting enough lubricant.', 4)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-kln-gear-wear', 'reading', 1, 'Drive gear bearing vibration', 'PYR-KLN-01-VIB-KLN-04'),
  ('g-pyr-kln-gear-wear', 'reading', 2, 'Gear lubricant spray working', 'PYR-KLN-01-STS-KLN-05'),
  ('g-pyr-kln-gear-wear', 'reading', 3, 'Lubricant spray nozzle 1 delivering', 'PYR-KLN-01-PRX-KLN-01'),
  ('g-pyr-kln-gear-wear', 'reading', 4, 'Gearbox output vibration', 'PYR-KLN-01-VIB-KLN-03'),
  ('g-pyr-kln-gear-wear', 'reading', 5, 'Main kiln motor load', 'PYR-KLN-01-ELE-KLN-01'),
  ('g-pyr-kln-gear-wear', 'check', 1, 'Check the lubricant drum is not empty and every nozzle sprays', NULL),
  ('g-pyr-kln-gear-wear', 'check', 2, 'Look at the gear teeth for pitting, scoring and uneven contact', NULL),
  ('g-pyr-kln-gear-wear', 'check', 3, 'Measure how much the ring gear wobbles while the kiln turns', NULL),
  ('g-pyr-kln-gear-wear', 'check', 4, 'Take a detailed vibration measurement on the drive gear bearings', NULL),
  ('g-pyr-kln-gear-wear', 'cause', 1, 'Dry gear teeth from a blocked nozzle or an empty lubricant drum', NULL),
  ('g-pyr-kln-gear-wear', 'cause', 2, 'Drive gear out of line with the ring gear', NULL),
  ('g-pyr-kln-gear-wear', 'cause', 3, 'Ring gear wobbling as the kiln turns', NULL),
  ('g-pyr-kln-gear-wear', 'cause', 4, 'Pitting on the teeth from long use', NULL)
ON CONFLICT DO NOTHING;

-- PYR-BRN-01 · Burner air fan running hot or shaking
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-brn-air-fan', 'PYR-BRN-01', 'PYR-BRN-01-brn-pafan', 'Burner air fan running hot or shaking', 'The fan that blows the air shaping the burner flame (primary air fan) has a bearing heating up or is vibrating more than usual.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-brn-air-fan', 'reading', 1, 'Burner air fan vibration', 'PYR-BRN-01-VIB-BRN-01'),
  ('g-pyr-brn-air-fan', 'reading', 2, 'Burner air fan bearing temperature', 'PYR-BRN-01-TMP-BRN-01'),
  ('g-pyr-brn-air-fan', 'reading', 3, 'Burner air fan motor current', 'PYR-BRN-01-ELE-BRN-01'),
  ('g-pyr-brn-air-fan', 'reading', 4, 'Burner air fan motor winding temperature', 'PYR-BRN-01-TMP-BRN-05'),
  ('g-pyr-brn-air-fan', 'reading', 5, 'Burner air pressure', 'PYR-BRN-01-PRS-BRN-03'),
  ('g-pyr-brn-air-fan', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-pyr-brn-air-fan', 'check', 2, 'Check the bearing grease and the fan blades for dirt or damage', NULL),
  ('g-pyr-brn-air-fan', 'check', 3, 'Take a detailed vibration measurement while the fan runs at its normal speed', NULL),
  ('g-pyr-brn-air-fan', 'cause', 1, 'Bearing wearing out or short of grease', NULL),
  ('g-pyr-brn-air-fan', 'cause', 2, 'Dirt build-up or damage on the fan blades making it unbalanced', NULL),
  ('g-pyr-brn-air-fan', 'cause', 3, 'Loose mounting or a sensor problem', NULL),
  ('g-pyr-brn-air-fan', 'cause', 4, 'The fan is being run harder than usual', NULL)
ON CONFLICT DO NOTHING;

-- PYR-BRN-01 · Coal flow to the burner blocking or weakening
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-brn-coal-flow', 'PYR-BRN-01', 'PYR-BRN-01-brn-coalfeed', 'Coal flow to the burner blocking or weakening', 'Less coal is reaching the kiln burner than set, or the pressure in the coal line is changing. The flame can weaken and the kiln cool down.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-brn-coal-flow', 'reading', 1, 'Coal flow to the kiln burner', 'PYR-BRN-01-FLO-BRN-01'),
  ('g-pyr-brn-coal-flow', 'reading', 2, 'Pressure in the coal line', 'PYR-BRN-01-PRS-BRN-04'),
  ('g-pyr-brn-coal-flow', 'reading', 3, 'Coal blower motor current', 'PYR-BRN-01-ELE-BRN-02'),
  ('g-pyr-brn-coal-flow', 'reading', 4, 'Coal blower vibration', 'PYR-BRN-01-VIB-BRN-02'),
  ('g-pyr-brn-coal-flow', 'reading', 5, 'Coal compared with raw meal feed', 'PYR-BRN-01-CAL-BRN-01'),
  ('g-pyr-brn-coal-flow', 'check', 1, 'Check the coal line and the burner coal channel for build-up', NULL),
  ('g-pyr-brn-coal-flow', 'check', 2, 'Check the coal blower drive belts for slipping and wear', NULL),
  ('g-pyr-brn-coal-flow', 'check', 3, 'Check the coal feeder weighing with a test weight', NULL),
  ('g-pyr-brn-coal-flow', 'check', 4, 'Check the coal for moisture in the latest lab result', NULL),
  ('g-pyr-brn-coal-flow', 'cause', 1, 'Coal building up in the line or the burner and choking it', NULL),
  ('g-pyr-brn-coal-flow', 'cause', 2, 'Worn coal blower letting air slip back inside', NULL),
  ('g-pyr-brn-coal-flow', 'cause', 3, 'Coal blower drive belts slipping', NULL),
  ('g-pyr-brn-coal-flow', 'cause', 4, 'Coal feeder weighing out of calibration', NULL),
  ('g-pyr-brn-coal-flow', 'cause', 5, 'Damp coal sticking in the line', NULL)
ON CONFLICT DO NOTHING;

-- PYR-BRN-01 · Burner flame changing shape
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-brn-flame', 'PYR-BRN-01', 'PYR-BRN-01-brn-burner', 'Burner flame changing shape', 'The flame at the kiln burner looks longer, shorter or less steady than usual. A changed flame can damage the kiln lining and make clinker of poor quality.', 3)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-brn-flame', 'reading', 1, 'Flame camera', 'PYR-BRN-01-CAM-BRN-01'),
  ('g-pyr-brn-flame', 'reading', 2, 'Burner swirl air pressure', 'PYR-BRN-01-PRS-BRN-01'),
  ('g-pyr-brn-flame', 'reading', 3, 'Burner straight jet air pressure', 'PYR-BRN-01-PRS-BRN-02'),
  ('g-pyr-brn-flame', 'reading', 4, 'Burner air pressure', 'PYR-BRN-01-PRS-BRN-03'),
  ('g-pyr-brn-flame', 'reading', 5, 'Temperature of hot air coming from the cooler into the kiln', 'PYR-BRN-01-TMP-BRN-02'),
  ('g-pyr-brn-flame', 'check', 1, 'Compare the flame camera picture with a recent normal flame', NULL),
  ('g-pyr-brn-flame', 'check', 2, 'At the next stop, inspect the burner tip for blocked or burnt channels', NULL),
  ('g-pyr-brn-flame', 'check', 3, 'Check the burner air channels and the air header for leaks', NULL),
  ('g-pyr-brn-flame', 'check', 4, 'Check the swirl setting on the burner has not been changed', NULL),
  ('g-pyr-brn-flame', 'cause', 1, 'Burner tip partly blocked', NULL),
  ('g-pyr-brn-flame', 'cause', 2, 'A leak in one of the burner channels or the air header', NULL),
  ('g-pyr-brn-flame', 'cause', 3, 'Damaged swirl vanes in the burner', NULL),
  ('g-pyr-brn-flame', 'cause', 4, 'A change in coal quality or fineness', NULL)
ON CONFLICT DO NOTHING;

-- PYR-BRN-01 · Fine coal bin heating up
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-brn-coal-bin', 'PYR-BRN-01', 'PYR-BRN-01-brn-coalbin', 'Fine coal bin heating up', 'Ground coal in the bin is getting warmer or giving off carbon monoxide (CO). It may be starting to smoulder, which can lead to a fire or an explosion.', 4)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-brn-coal-bin', 'reading', 1, 'Coal bin temperature', 'PYR-BRN-01-TMP-BRN-04'),
  ('g-pyr-brn-coal-bin', 'reading', 2, 'Carbon monoxide in the coal bin', 'PYR-BRN-01-GAS-BRN-01'),
  ('g-pyr-brn-coal-bin', 'reading', 3, 'Coal bin level', 'PYR-BRN-01-LEV-BRN-01'),
  ('g-pyr-brn-coal-bin', 'reading', 4, 'Coal flow to the kiln burner', 'PYR-BRN-01-FLO-BRN-01'),
  ('g-pyr-brn-coal-bin', 'check', 1, 'Measure carbon monoxide at the top of the bin with a portable gas meter', NULL),
  ('g-pyr-brn-coal-bin', 'check', 2, 'Check how long the coal has been in the bin and keep it moving', NULL),
  ('g-pyr-brn-coal-bin', 'check', 3, 'Check the fire-smothering gas supply for the bin is ready to use', NULL),
  ('g-pyr-brn-coal-bin', 'check', 4, 'Check the temperature of the coal coming from the coal mill', NULL),
  ('g-pyr-brn-coal-bin', 'cause', 1, 'Coal left in the bin too long', NULL),
  ('g-pyr-brn-coal-bin', 'cause', 2, 'Coal coming from the mill too hot', NULL),
  ('g-pyr-brn-coal-bin', 'cause', 3, 'Coal stuck on the bin walls and smouldering', NULL),
  ('g-pyr-brn-coal-bin', 'cause', 4, 'A faulty gas sensor', NULL)
ON CONFLICT DO NOTHING;

-- PYR-CLR-01 · Cooling fan running hot or shaking
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-clr-fan-heat', 'PYR-CLR-01', 'PYR-CLR-01-clr-fans13', 'Cooling fan running hot or shaking', 'A cooling fan''s bearing is heating up or the fan is vibrating more than usual.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-clr-fan-heat', 'reading', 1, 'Cooling fan 1 vibration', 'PYR-CLR-01-VIB-CLR-01'),
  ('g-pyr-clr-fan-heat', 'reading', 2, 'Cooling fan 1 bearing temperature', 'PYR-CLR-01-TMP-CLR-01'),
  ('g-pyr-clr-fan-heat', 'reading', 3, 'Cooling fan 1 motor current', 'PYR-CLR-01-ELE-CLR-01'),
  ('g-pyr-clr-fan-heat', 'reading', 4, 'Cooling fan 1 motor winding temperature', 'PYR-CLR-01-TMP-CLR-17'),
  ('g-pyr-clr-fan-heat', 'reading', 5, 'Air pressure under cooler section 1', 'PYR-CLR-01-PRS-CLR-01'),
  ('g-pyr-clr-fan-heat', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-pyr-clr-fan-heat', 'check', 2, 'Check the bearing grease and the fan blades for dirt or damage', NULL),
  ('g-pyr-clr-fan-heat', 'check', 3, 'Take a detailed vibration measurement while the fan runs at its normal speed', NULL),
  ('g-pyr-clr-fan-heat', 'cause', 1, 'Bearing wearing out or short of grease', NULL),
  ('g-pyr-clr-fan-heat', 'cause', 2, 'Dirt build-up or damage on the fan blades making it unbalanced', NULL),
  ('g-pyr-clr-fan-heat', 'cause', 3, 'Loose mounting or a sensor problem', NULL),
  ('g-pyr-clr-fan-heat', 'cause', 4, 'The fan is being run harder than usual', NULL)
ON CONFLICT DO NOTHING;

-- PYR-CLR-01 · Cooler grate jammed or losing hydraulic power
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-clr-grate-drive', 'PYR-CLR-01', 'PYR-CLR-01-clr-drive', 'Cooler grate jammed or losing hydraulic power', 'The hydraulic pressure that moves the cooler grate is rising or falling, or the grate is moving slower than set. Hot clinker can pile up at the cooler inlet.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-clr-grate-drive', 'reading', 1, 'Grate hydraulic pressure', 'PYR-CLR-01-PRS-CLR-07'),
  ('g-pyr-clr-grate-drive', 'reading', 2, 'Grate strokes per minute', 'PYR-CLR-01-SPD-CLR-01'),
  ('g-pyr-clr-grate-drive', 'reading', 3, 'Grate hydraulic oil temperature', 'PYR-CLR-01-TMP-CLR-07'),
  ('g-pyr-clr-grate-drive', 'reading', 4, 'Grate grease pumps running', 'PYR-CLR-01-STS-CLR-01'),
  ('g-pyr-clr-grate-drive', 'reading', 5, 'Air pressure under cooler section 1', 'PYR-CLR-01-PRS-CLR-01'),
  ('g-pyr-clr-grate-drive', 'check', 1, 'Look through the inspection ports for a pile of sticky clinker or large lumps at the inlet', NULL),
  ('g-pyr-clr-grate-drive', 'check', 2, 'Check the hydraulic oil level, the filter and the cylinders for leaks', NULL),
  ('g-pyr-clr-grate-drive', 'check', 3, 'Check the hydraulic pump and the pressure relief valve setting', NULL),
  ('g-pyr-clr-grate-drive', 'check', 4, 'Check the grate grease pumps are running', NULL),
  ('g-pyr-clr-grate-drive', 'cause', 1, 'A pile of sticky clinker at the cooler inlet', NULL),
  ('g-pyr-clr-grate-drive', 'cause', 2, 'Large lumps of coating fallen from the kiln', NULL),
  ('g-pyr-clr-grate-drive', 'cause', 3, 'Worn hydraulic pump or relief valve', NULL),
  ('g-pyr-clr-grate-drive', 'cause', 4, 'Oil leaking past the seals inside a cylinder', NULL),
  ('g-pyr-clr-grate-drive', 'cause', 5, 'Hydraulic oil too hot or too low', NULL)
ON CONFLICT DO NOTHING;

-- PYR-CLR-01 · Clinker leaving the cooler too hot
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-clr-hot-clinker', 'PYR-CLR-01', 'PYR-CLR-01-clr-discharge', 'Clinker leaving the cooler too hot', 'Clinker coming out of the cooler is hotter than usual. Hot clinker can damage the crusher and conveyor, and the heat it carries is lost.', 3)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-clr-hot-clinker', 'reading', 1, 'Clinker temperature at the cooler outlet', 'PYR-CLR-01-TMP-CLR-08'),
  ('g-pyr-clr-hot-clinker', 'reading', 2, 'Cooler exhaust gas temperature', 'PYR-CLR-01-TMP-CLR-09'),
  ('g-pyr-clr-hot-clinker', 'reading', 3, 'Air pressure under cooler section 2', 'PYR-CLR-01-PRS-CLR-02'),
  ('g-pyr-clr-hot-clinker', 'reading', 4, 'Temperature under the grate in section 4', 'PYR-CLR-01-TMP-CLR-14'),
  ('g-pyr-clr-hot-clinker', 'reading', 5, 'Cooling fan 4 motor current', 'PYR-CLR-01-ELE-CLR-04'),
  ('g-pyr-clr-hot-clinker', 'check', 1, 'Look for a stream of red-hot fine clinker running through the cooler', NULL),
  ('g-pyr-clr-hot-clinker', 'check', 2, 'Check all cooling fans are running and their air dampers are open', NULL),
  ('g-pyr-clr-hot-clinker', 'check', 3, 'Check the clinker bed depth and the grate speed', NULL),
  ('g-pyr-clr-hot-clinker', 'check', 4, 'Clean the window of the outlet temperature camera', NULL),
  ('g-pyr-clr-hot-clinker', 'cause', 1, 'A stream of fine hot clinker flowing through the bed without cooling', NULL),
  ('g-pyr-clr-hot-clinker', 'cause', 2, 'Cooling air not spread evenly across the grate', NULL),
  ('g-pyr-clr-hot-clinker', 'cause', 3, 'A cooling fan giving less air than set', NULL),
  ('g-pyr-clr-hot-clinker', 'cause', 4, 'Worn or missing grate plates letting air bypass the clinker', NULL),
  ('g-pyr-clr-hot-clinker', 'cause', 5, 'A dirty camera window giving a false reading', NULL)
ON CONFLICT DO NOTHING;

-- PYR-CLR-01 · Cooler exhaust fan dirty or wearing
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-clr-vent-fan', 'PYR-CLR-01', 'PYR-CLR-01-clr-vent', 'Cooler exhaust fan dirty or wearing', 'The fan that draws dusty air out of the cooler is vibrating more, heating up or drawing more current than usual.', 4)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-clr-vent-fan', 'reading', 1, 'Cooler exhaust fan vibration', 'PYR-CLR-01-VIB-CLR-07'),
  ('g-pyr-clr-vent-fan', 'reading', 2, 'Cooler exhaust fan bearing temperature', 'PYR-CLR-01-TMP-CLR-10'),
  ('g-pyr-clr-vent-fan', 'reading', 3, 'Cooler exhaust fan motor current', 'PYR-CLR-01-ELE-CLR-07'),
  ('g-pyr-clr-vent-fan', 'reading', 4, 'Cooler exhaust fan motor winding temperature', 'PYR-CLR-01-TMP-CLR-23'),
  ('g-pyr-clr-vent-fan', 'reading', 5, 'Cooler exhaust gas temperature', 'PYR-CLR-01-TMP-CLR-09'),
  ('g-pyr-clr-vent-fan', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-pyr-clr-vent-fan', 'check', 2, 'At the next stop, look at the fan blades for dust build-up and wear', NULL),
  ('g-pyr-clr-vent-fan', 'check', 3, 'Check the bearing grease', NULL),
  ('g-pyr-clr-vent-fan', 'check', 4, 'Take a detailed vibration measurement while the fan runs at its normal speed', NULL),
  ('g-pyr-clr-vent-fan', 'cause', 1, 'Dust building up on the fan blades', NULL),
  ('g-pyr-clr-vent-fan', 'cause', 2, 'Fan blades worn by dust', NULL),
  ('g-pyr-clr-vent-fan', 'cause', 3, 'Bearing wearing out or short of grease', NULL),
  ('g-pyr-clr-vent-fan', 'cause', 4, 'Exhaust air hotter than usual', NULL)
ON CONFLICT DO NOTHING;

-- PYR-CCT-01 · Clinker crusher bearing running hot or shaking
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-cct-rotor-bearing', 'PYR-CCT-01', 'PYR-CCT-01-hmr-rotor', 'Clinker crusher bearing running hot or shaking', 'A bearing on the crusher''s hammer rotor is heating up or vibrating more than usual.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-cct-rotor-bearing', 'reading', 1, 'Crusher bearing vibration at the drive end', 'PYR-CCT-01-VIB-HMR-01'),
  ('g-pyr-cct-rotor-bearing', 'reading', 2, 'Crusher bearing vibration at the far end', 'PYR-CCT-01-VIB-HMR-02'),
  ('g-pyr-cct-rotor-bearing', 'reading', 3, 'Crusher bearing temperature at the drive end', 'PYR-CCT-01-TMP-HMR-01'),
  ('g-pyr-cct-rotor-bearing', 'reading', 4, 'Crusher bearing temperature at the far end', 'PYR-CCT-01-TMP-HMR-02'),
  ('g-pyr-cct-rotor-bearing', 'reading', 5, 'Crusher shaft speed', 'PYR-CCT-01-SPD-HMR-01'),
  ('g-pyr-cct-rotor-bearing', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-pyr-cct-rotor-bearing', 'check', 2, 'Check the bearing grease and the bearing housing bolts', NULL),
  ('g-pyr-cct-rotor-bearing', 'check', 3, 'Take a detailed vibration measurement while the crusher runs at its normal speed', NULL),
  ('g-pyr-cct-rotor-bearing', 'cause', 1, 'Bearing wearing out or short of grease', NULL),
  ('g-pyr-cct-rotor-bearing', 'cause', 2, 'A hammer worn or lost, making the rotor unbalanced', NULL),
  ('g-pyr-cct-rotor-bearing', 'cause', 3, 'Loose bearing housing or a sensor problem', NULL),
  ('g-pyr-cct-rotor-bearing', 'cause', 4, 'Very hot clinker heating the bearing', NULL)
ON CONFLICT DO NOTHING;

-- PYR-CCT-01 · Clinker crusher jammed or overloaded
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-cct-crusher-jam', 'PYR-CCT-01', 'PYR-CCT-01-hmr-motor', 'Clinker crusher jammed or overloaded', 'The crusher motor is drawing more current than usual or the crusher is slowing down. Large lumps or metal may be stuck in it.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-cct-crusher-jam', 'reading', 1, 'Crusher motor current', 'PYR-CCT-01-ELE-HMR-01'),
  ('g-pyr-cct-crusher-jam', 'reading', 2, 'Crusher shaft speed', 'PYR-CCT-01-SPD-HMR-01'),
  ('g-pyr-cct-crusher-jam', 'reading', 3, 'Crusher motor winding temperature', 'PYR-CCT-01-TMP-HMR-03'),
  ('g-pyr-cct-crusher-jam', 'reading', 4, 'Crusher bearing vibration at the drive end', 'PYR-CCT-01-VIB-HMR-01'),
  ('g-pyr-cct-crusher-jam', 'check', 1, 'Stop the crusher safely and look inside for large lumps or metal', NULL),
  ('g-pyr-cct-crusher-jam', 'check', 2, 'Check the hammers for wear and that none are missing', NULL),
  ('g-pyr-cct-crusher-jam', 'check', 3, 'Check the gap between the hammers and the breaker plate', NULL),
  ('g-pyr-cct-crusher-jam', 'check', 4, 'Check whether coating recently fell from the kiln', NULL),
  ('g-pyr-cct-crusher-jam', 'cause', 1, 'Large lumps of coating fallen from the kiln', NULL),
  ('g-pyr-cct-crusher-jam', 'cause', 2, 'A piece of metal caught in the crusher', NULL),
  ('g-pyr-cct-crusher-jam', 'cause', 3, 'Worn hammers that no longer break the clinker well', NULL),
  ('g-pyr-cct-crusher-jam', 'cause', 4, 'A lost hammer making the rotor unbalanced', NULL)
ON CONFLICT DO NOTHING;

-- PYR-CCT-01 · Clinker conveyor dragging or stopped
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-cct-conveyor-drag', 'PYR-CCT-01', 'PYR-CCT-01-csl-conveyor', 'Clinker conveyor dragging or stopped', 'The conveyor that carries clinker to the silo is drawing more current than usual or its chain is slowing down or stopped.', 3)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-cct-conveyor-drag', 'reading', 1, 'Clinker conveyor motor current', 'PYR-CCT-01-ELE-CSL-01'),
  ('g-pyr-cct-conveyor-drag', 'reading', 2, 'Clinker conveyor chain speed', 'PYR-CCT-01-SPD-CSL-01'),
  ('g-pyr-cct-conveyor-drag', 'reading', 3, 'Clinker conveyor drive vibration', 'PYR-CCT-01-VIB-CSL-01'),
  ('g-pyr-cct-conveyor-drag', 'reading', 4, 'Clinker conveyor motor winding temperature', 'PYR-CCT-01-TMP-CSL-02'),
  ('g-pyr-cct-conveyor-drag', 'check', 1, 'Walk the conveyor and look for seized rollers and spilled clinker', NULL),
  ('g-pyr-cct-conveyor-drag', 'check', 2, 'Check the chain for broken links, missing pins and stretch', NULL),
  ('g-pyr-cct-conveyor-drag', 'check', 3, 'Check the chain sits correctly on the drive sprocket', NULL),
  ('g-pyr-cct-conveyor-drag', 'check', 4, 'Check the drive gearbox oil and listen for noise from the drive', NULL),
  ('g-pyr-cct-conveyor-drag', 'cause', 1, 'A worn or stretched chain', NULL),
  ('g-pyr-cct-conveyor-drag', 'cause', 2, 'Rollers under the pans seized', NULL),
  ('g-pyr-cct-conveyor-drag', 'cause', 3, 'Spilled clinker dragging under the conveyor', NULL),
  ('g-pyr-cct-conveyor-drag', 'cause', 4, 'A broken chain link or pin', NULL),
  ('g-pyr-cct-conveyor-drag', 'cause', 5, 'A worn drive gearbox or bearing', NULL)
ON CONFLICT DO NOTHING;

-- PYR-CCT-01 · Clinker silo dust filter clogged or torn
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-pyr-cct-silo-filter', 'PYR-CCT-01', 'PYR-CCT-01-csl-silo', 'Clinker silo dust filter clogged or torn', 'The pressure difference across the filter bags on the clinker silo is too high or too low. Bags may be clogged with dust or torn and letting dust out.', 4)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-pyr-cct-silo-filter', 'reading', 1, 'Pressure difference across the silo filter bags', 'PYR-CCT-01-PRS-CSL-01'),
  ('g-pyr-cct-silo-filter', 'reading', 2, 'Silo dust fan motor current', 'PYR-CCT-01-ELE-CSL-02'),
  ('g-pyr-cct-silo-filter', 'reading', 3, 'Clinker silo level', 'PYR-CCT-01-LEV-CSL-01'),
  ('g-pyr-cct-silo-filter', 'check', 1, 'Check the bag cleaning air pulses are firing on every row', NULL),
  ('g-pyr-cct-silo-filter', 'check', 2, 'Check the compressed air for the cleaning pulses is dry and at full pressure', NULL),
  ('g-pyr-cct-silo-filter', 'check', 3, 'Open the filter and look for torn or loose bags', NULL),
  ('g-pyr-cct-silo-filter', 'check', 4, 'Look for dust coming from the filter outlet', NULL),
  ('g-pyr-cct-silo-filter', 'cause', 1, 'Filter bags clogged with fine dust', NULL),
  ('g-pyr-cct-silo-filter', 'cause', 2, 'Bag cleaning pulses not working', NULL),
  ('g-pyr-cct-silo-filter', 'cause', 3, 'Damp air making the dust stick to the bags', NULL),
  ('g-pyr-cct-silo-filter', 'cause', 4, 'A torn or loose bag letting dust through', NULL)
ON CONFLICT DO NOTHING;

-- KLN-01 · Outside air leaking in at the kiln feed end
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-kln-01-inlet-seal', 'KLN-01', 'KLN-01-inlet-seal', 'Outside air leaking in at the kiln feed end', 'There is more oxygen at the kiln inlet than expected, so outside air may be getting in past the seal where the turning kiln meets the fixed inlet chamber. Fuel is wasted and the flame can change.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-kln-01-inlet-seal', 'reading', 1, 'Extra oxygen at the kiln inlet above what is expected', 'KLN-01-CAL-KLN-06'),
  ('g-kln-01-inlet-seal', 'reading', 2, 'Seal overlap left at the current kiln position', 'KLN-01-CAL-KLN-07'),
  ('g-kln-01-inlet-seal', 'reading', 3, 'Oxygen at the kiln inlet', 'KLN-01-GAS-KLN-01'),
  ('g-kln-01-inlet-seal', 'reading', 4, 'Suction at the kiln inlet', 'KLN-01-PRS-KLN-01'),
  ('g-kln-01-inlet-seal', 'reading', 5, 'Kiln position along its length', 'KLN-01-POS-KLN-01'),
  ('g-kln-01-inlet-seal', 'check', 1, 'Look at the inlet seal plates for wear, gaps and missing plates', NULL),
  ('g-kln-01-inlet-seal', 'check', 2, 'Check the inlet chamber doors are closed and sealed', NULL),
  ('g-kln-01-inlet-seal', 'check', 3, 'Check the kiln''s position along its length is inside the seal''s range', NULL),
  ('g-kln-01-inlet-seal', 'check', 4, 'Check the gas analyser with calibration gas', NULL),
  ('g-kln-01-inlet-seal', 'cause', 1, 'Worn or missing seal plates', NULL),
  ('g-kln-01-inlet-seal', 'cause', 2, 'An inlet chamber door left open', NULL),
  ('g-kln-01-inlet-seal', 'cause', 3, 'The kiln has moved too far along its length for the seal', NULL),
  ('g-kln-01-inlet-seal', 'cause', 4, 'The gas analyser drifting and reading wrong', NULL)
ON CONFLICT DO NOTHING;

-- KLN-01 · Kiln gearbox running hot or shaking
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-kln-01-gearbox', 'KLN-01', 'KLN-01-gearbox', 'Kiln gearbox running hot or shaking', 'The main gearbox that turns the kiln is heating up or vibrating more than usual. A bearing may be wearing or the gearbox may be short of good oil.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-kln-01-gearbox', 'reading', 1, 'Gearbox input vibration', 'KLN-01-VIB-KLN-02'),
  ('g-kln-01-gearbox', 'reading', 2, 'Gearbox output vibration', 'KLN-01-VIB-KLN-03'),
  ('g-kln-01-gearbox', 'reading', 3, 'Gearbox input bearing temperature', 'KLN-01-TMP-KLN-22'),
  ('g-kln-01-gearbox', 'reading', 4, 'Gearbox output bearing temperature', 'KLN-01-TMP-KLN-23'),
  ('g-kln-01-gearbox', 'reading', 5, 'Gearbox oil temperature', 'KLN-01-TMP-KLN-15'),
  ('g-kln-01-gearbox', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-kln-01-gearbox', 'check', 2, 'Check the oil pressure, oil level and the oil filter', NULL),
  ('g-kln-01-gearbox', 'check', 3, 'Take an oil sample for wear metal and water', NULL),
  ('g-kln-01-gearbox', 'check', 4, 'Take a detailed vibration measurement while the kiln turns at its normal speed', NULL),
  ('g-kln-01-gearbox', 'cause', 1, 'Bearing wearing out', NULL),
  ('g-kln-01-gearbox', 'cause', 2, 'Old or dirty oil, or too little oil reaching the gears', NULL),
  ('g-kln-01-gearbox', 'cause', 3, 'Motor and gearbox out of line', NULL),
  ('g-kln-01-gearbox', 'cause', 4, 'Oil cooler dirty or short of cooling water', NULL),
  ('g-kln-01-gearbox', 'cause', 5, 'Loose mounting or a sensor problem', NULL)
ON CONFLICT DO NOTHING;

-- KLN-02 · Outside air leaking in at the kiln feed end
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-kln-02-inlet-seal', 'KLN-02', 'KLN-02-inlet-seal', 'Outside air leaking in at the kiln feed end', 'There is more oxygen at the kiln inlet than expected, so outside air may be getting in past the seal where the turning kiln meets the fixed inlet chamber. Fuel is wasted and the flame can change.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-kln-02-inlet-seal', 'reading', 1, 'Extra oxygen at the kiln inlet above what is expected', 'KLN-02-CAL-KLN-06'),
  ('g-kln-02-inlet-seal', 'reading', 2, 'Seal overlap left at the current kiln position', 'KLN-02-CAL-KLN-07'),
  ('g-kln-02-inlet-seal', 'reading', 3, 'Oxygen at the kiln inlet', 'KLN-02-GAS-KLN-01'),
  ('g-kln-02-inlet-seal', 'reading', 4, 'Suction at the kiln inlet', 'KLN-02-PRS-KLN-01'),
  ('g-kln-02-inlet-seal', 'reading', 5, 'Kiln position along its length', 'KLN-02-POS-KLN-01'),
  ('g-kln-02-inlet-seal', 'check', 1, 'Look at the inlet seal plates for wear, gaps and missing plates', NULL),
  ('g-kln-02-inlet-seal', 'check', 2, 'Check the inlet chamber doors are closed and sealed', NULL),
  ('g-kln-02-inlet-seal', 'check', 3, 'Check the kiln''s position along its length is inside the seal''s range', NULL),
  ('g-kln-02-inlet-seal', 'check', 4, 'Check the gas analyser with calibration gas', NULL),
  ('g-kln-02-inlet-seal', 'cause', 1, 'Worn or missing seal plates', NULL),
  ('g-kln-02-inlet-seal', 'cause', 2, 'An inlet chamber door left open', NULL),
  ('g-kln-02-inlet-seal', 'cause', 3, 'The kiln has moved too far along its length for the seal', NULL),
  ('g-kln-02-inlet-seal', 'cause', 4, 'The gas analyser drifting and reading wrong', NULL)
ON CONFLICT DO NOTHING;

-- KLN-02 · Kiln gearbox running hot or shaking
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-kln-02-gearbox', 'KLN-02', 'KLN-02-gearbox', 'Kiln gearbox running hot or shaking', 'The main gearbox that turns the kiln is heating up or vibrating more than usual. A bearing may be wearing or the gearbox may be short of good oil.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-kln-02-gearbox', 'reading', 1, 'Gearbox input vibration', 'KLN-02-VIB-KLN-02'),
  ('g-kln-02-gearbox', 'reading', 2, 'Gearbox output vibration', 'KLN-02-VIB-KLN-03'),
  ('g-kln-02-gearbox', 'reading', 3, 'Gearbox input bearing temperature', 'KLN-02-TMP-KLN-22'),
  ('g-kln-02-gearbox', 'reading', 4, 'Gearbox output bearing temperature', 'KLN-02-TMP-KLN-23'),
  ('g-kln-02-gearbox', 'reading', 5, 'Gearbox oil temperature', 'KLN-02-TMP-KLN-15'),
  ('g-kln-02-gearbox', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-kln-02-gearbox', 'check', 2, 'Check the oil pressure, oil level and the oil filter', NULL),
  ('g-kln-02-gearbox', 'check', 3, 'Take an oil sample for wear metal and water', NULL),
  ('g-kln-02-gearbox', 'check', 4, 'Take a detailed vibration measurement while the kiln turns at its normal speed', NULL),
  ('g-kln-02-gearbox', 'cause', 1, 'Bearing wearing out', NULL),
  ('g-kln-02-gearbox', 'cause', 2, 'Old or dirty oil, or too little oil reaching the gears', NULL),
  ('g-kln-02-gearbox', 'cause', 3, 'Motor and gearbox out of line', NULL),
  ('g-kln-02-gearbox', 'cause', 4, 'Oil cooler dirty or short of cooling water', NULL),
  ('g-kln-02-gearbox', 'cause', 5, 'Loose mounting or a sensor problem', NULL)
ON CONFLICT DO NOTHING;

-- KLN-03 · Outside air leaking in at the kiln feed end
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-kln-03-inlet-seal', 'KLN-03', 'KLN-03-inlet-seal', 'Outside air leaking in at the kiln feed end', 'There is more oxygen at the kiln inlet than expected, so outside air may be getting in past the seal where the turning kiln meets the fixed inlet chamber. Fuel is wasted and the flame can change.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-kln-03-inlet-seal', 'reading', 1, 'Extra oxygen at the kiln inlet above what is expected', 'KLN-03-CAL-KLN-06'),
  ('g-kln-03-inlet-seal', 'reading', 2, 'Seal overlap left at the current kiln position', 'KLN-03-CAL-KLN-07'),
  ('g-kln-03-inlet-seal', 'reading', 3, 'Oxygen at the kiln inlet', 'KLN-03-GAS-KLN-01'),
  ('g-kln-03-inlet-seal', 'reading', 4, 'Suction at the kiln inlet', 'KLN-03-PRS-KLN-01'),
  ('g-kln-03-inlet-seal', 'reading', 5, 'Kiln position along its length', 'KLN-03-POS-KLN-01'),
  ('g-kln-03-inlet-seal', 'check', 1, 'Look at the inlet seal plates for wear, gaps and missing plates', NULL),
  ('g-kln-03-inlet-seal', 'check', 2, 'Check the inlet chamber doors are closed and sealed', NULL),
  ('g-kln-03-inlet-seal', 'check', 3, 'Check the kiln''s position along its length is inside the seal''s range', NULL),
  ('g-kln-03-inlet-seal', 'check', 4, 'Check the gas analyser with calibration gas', NULL),
  ('g-kln-03-inlet-seal', 'cause', 1, 'Worn or missing seal plates', NULL),
  ('g-kln-03-inlet-seal', 'cause', 2, 'An inlet chamber door left open', NULL),
  ('g-kln-03-inlet-seal', 'cause', 3, 'The kiln has moved too far along its length for the seal', NULL),
  ('g-kln-03-inlet-seal', 'cause', 4, 'The gas analyser drifting and reading wrong', NULL)
ON CONFLICT DO NOTHING;

-- KLN-03 · Kiln gearbox running hot or shaking
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-kln-03-gearbox', 'KLN-03', 'KLN-03-gearbox', 'Kiln gearbox running hot or shaking', 'The main gearbox that turns the kiln is heating up or vibrating more than usual. A bearing may be wearing or the gearbox may be short of good oil.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-kln-03-gearbox', 'reading', 1, 'Gearbox input vibration', 'KLN-03-VIB-KLN-02'),
  ('g-kln-03-gearbox', 'reading', 2, 'Gearbox output vibration', 'KLN-03-VIB-KLN-03'),
  ('g-kln-03-gearbox', 'reading', 3, 'Gearbox input bearing temperature', 'KLN-03-TMP-KLN-22'),
  ('g-kln-03-gearbox', 'reading', 4, 'Gearbox output bearing temperature', 'KLN-03-TMP-KLN-23'),
  ('g-kln-03-gearbox', 'reading', 5, 'Gearbox oil temperature', 'KLN-03-TMP-KLN-15'),
  ('g-kln-03-gearbox', 'check', 1, 'Check the sensor is mounted firmly and reading correctly', NULL),
  ('g-kln-03-gearbox', 'check', 2, 'Check the oil pressure, oil level and the oil filter', NULL),
  ('g-kln-03-gearbox', 'check', 3, 'Take an oil sample for wear metal and water', NULL),
  ('g-kln-03-gearbox', 'check', 4, 'Take a detailed vibration measurement while the kiln turns at its normal speed', NULL),
  ('g-kln-03-gearbox', 'cause', 1, 'Bearing wearing out', NULL),
  ('g-kln-03-gearbox', 'cause', 2, 'Old or dirty oil, or too little oil reaching the gears', NULL),
  ('g-kln-03-gearbox', 'cause', 3, 'Motor and gearbox out of line', NULL),
  ('g-kln-03-gearbox', 'cause', 4, 'Oil cooler dirty or short of cooling water', NULL),
  ('g-kln-03-gearbox', 'cause', 5, 'Loose mounting or a sensor problem', NULL)
ON CONFLICT DO NOTHING;

-- VPC-066 · Vacuum pump struggling to pull the vacuum
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-vpc-066-vacuum', 'VPC-066', 'VPC-066-vpc-vac-pump', 'Vacuum pump struggling to pull the vacuum', 'The vacuum pump takes longer than usual to empty the air from the mould chamber, or the chamber does not reach its usual low pressure. Castings can come out with holes or not fill.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-vpc-066-vacuum', 'reading', 1, 'Mould chamber pressure', 'VPC-066-P2'),
  ('g-vpc-066-vacuum', 'reading', 2, 'Vacuum pump suction pressure', 'VPC-066-P4'),
  ('g-vpc-066-vacuum', 'reading', 3, 'Vacuum pump motor current', 'VPC-066-E2'),
  ('g-vpc-066-vacuum', 'reading', 4, 'Vacuum pump housing temperature', 'VPC-066-T4'),
  ('g-vpc-066-vacuum', 'reading', 5, 'Vacuum pump vibration', 'VPC-066-V1'),
  ('g-vpc-066-vacuum', 'check', 1, 'Check the suction filter and hose for blockage', NULL),
  ('g-vpc-066-vacuum', 'check', 2, 'Check the mould chamber door seal for dirt or damage and that it closes fully', NULL),
  ('g-vpc-066-vacuum', 'check', 3, 'Check the vacuum pump oil level and condition', NULL),
  ('g-vpc-066-vacuum', 'check', 4, 'Close the empty chamber, shut off the pump and see how fast the pressure rises', NULL),
  ('g-vpc-066-vacuum', 'cause', 1, 'Worn vanes or rotor inside the vacuum pump', NULL),
  ('g-vpc-066-vacuum', 'cause', 2, 'Suction filter or line blocked', NULL),
  ('g-vpc-066-vacuum', 'cause', 3, 'Mould chamber seal leaking', NULL),
  ('g-vpc-066-vacuum', 'cause', 4, 'A shut-off valve not closing fully', NULL),
  ('g-vpc-066-vacuum', 'cause', 5, 'Vacuum pump oil old or low', NULL)
ON CONFLICT DO NOTHING;

-- VPC-066 · Cooling water too warm or flowing too little
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-vpc-066-cooling', 'VPC-066', 'VPC-066-vpc-cool-loop', 'Cooling water too warm or flowing too little', 'The cooling water for the melting coil is flowing less than usual or warming up more as it passes through the machine. The coil can overheat and the heater will cut out.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-vpc-066-cooling', 'reading', 1, 'Cooling water flow', 'VPC-066-F1'),
  ('g-vpc-066-cooling', 'reading', 2, 'Cooling water temperature going in', 'VPC-066-T2'),
  ('g-vpc-066-cooling', 'reading', 3, 'Cooling water temperature coming out', 'VPC-066-T3'),
  ('g-vpc-066-cooling', 'reading', 4, 'Cooling water temperature rise through the machine', 'VPC-066-DT1'),
  ('g-vpc-066-cooling', 'reading', 5, 'Melting heater power', 'VPC-066-E1'),
  ('g-vpc-066-cooling', 'check', 1, 'Check the cooling water strainer and clean it', NULL),
  ('g-vpc-066-cooling', 'check', 2, 'Check the hoses for kinks and leaks', NULL),
  ('g-vpc-066-cooling', 'check', 3, 'Check the chiller is running and its supply temperature is normal', NULL),
  ('g-vpc-066-cooling', 'check', 4, 'Check the coil water channels for scale at the next service', NULL),
  ('g-vpc-066-cooling', 'cause', 1, 'Strainer blocked', NULL),
  ('g-vpc-066-cooling', 'cause', 2, 'A hose pinched or kinked', NULL),
  ('g-vpc-066-cooling', 'cause', 3, 'Scale building up inside the coil', NULL),
  ('g-vpc-066-cooling', 'cause', 4, 'Cooling pump getting weak', NULL),
  ('g-vpc-066-cooling', 'cause', 5, 'Chiller overloaded or the plant water too warm', NULL)
ON CONFLICT DO NOTHING;

-- VPC-067 · Vacuum pump struggling to pull the vacuum
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-vpc-067-vacuum', 'VPC-067', 'VPC-067-vpc-vac-pump', 'Vacuum pump struggling to pull the vacuum', 'The vacuum pump takes longer than usual to empty the air from the mould chamber, or the chamber does not reach its usual low pressure. Castings can come out with holes or not fill.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-vpc-067-vacuum', 'reading', 1, 'Mould chamber pressure', 'VPC-067-P2'),
  ('g-vpc-067-vacuum', 'reading', 2, 'Vacuum pump suction pressure', 'VPC-067-P4'),
  ('g-vpc-067-vacuum', 'reading', 3, 'Vacuum pump motor current', 'VPC-067-E2'),
  ('g-vpc-067-vacuum', 'reading', 4, 'Vacuum pump housing temperature', 'VPC-067-T4'),
  ('g-vpc-067-vacuum', 'reading', 5, 'Vacuum pump vibration', 'VPC-067-V1'),
  ('g-vpc-067-vacuum', 'check', 1, 'Check the suction filter and hose for blockage', NULL),
  ('g-vpc-067-vacuum', 'check', 2, 'Check the mould chamber door seal for dirt or damage and that it closes fully', NULL),
  ('g-vpc-067-vacuum', 'check', 3, 'Check the vacuum pump oil level and condition', NULL),
  ('g-vpc-067-vacuum', 'check', 4, 'Close the empty chamber, shut off the pump and see how fast the pressure rises', NULL),
  ('g-vpc-067-vacuum', 'cause', 1, 'Worn vanes or rotor inside the vacuum pump', NULL),
  ('g-vpc-067-vacuum', 'cause', 2, 'Suction filter or line blocked', NULL),
  ('g-vpc-067-vacuum', 'cause', 3, 'Mould chamber seal leaking', NULL),
  ('g-vpc-067-vacuum', 'cause', 4, 'A shut-off valve not closing fully', NULL),
  ('g-vpc-067-vacuum', 'cause', 5, 'Vacuum pump oil old or low', NULL)
ON CONFLICT DO NOTHING;

-- VPC-067 · Cooling water too warm or flowing too little
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-vpc-067-cooling', 'VPC-067', 'VPC-067-vpc-cool-loop', 'Cooling water too warm or flowing too little', 'The cooling water for the melting coil is flowing less than usual or warming up more as it passes through the machine. The coil can overheat and the heater will cut out.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-vpc-067-cooling', 'reading', 1, 'Cooling water flow', 'VPC-067-F1'),
  ('g-vpc-067-cooling', 'reading', 2, 'Cooling water temperature going in', 'VPC-067-T2'),
  ('g-vpc-067-cooling', 'reading', 3, 'Cooling water temperature coming out', 'VPC-067-T3'),
  ('g-vpc-067-cooling', 'reading', 4, 'Cooling water temperature rise through the machine', 'VPC-067-DT1'),
  ('g-vpc-067-cooling', 'reading', 5, 'Melting heater power', 'VPC-067-E1'),
  ('g-vpc-067-cooling', 'check', 1, 'Check the cooling water strainer and clean it', NULL),
  ('g-vpc-067-cooling', 'check', 2, 'Check the hoses for kinks and leaks', NULL),
  ('g-vpc-067-cooling', 'check', 3, 'Check the chiller is running and its supply temperature is normal', NULL),
  ('g-vpc-067-cooling', 'check', 4, 'Check the coil water channels for scale at the next service', NULL),
  ('g-vpc-067-cooling', 'cause', 1, 'Strainer blocked', NULL),
  ('g-vpc-067-cooling', 'cause', 2, 'A hose pinched or kinked', NULL),
  ('g-vpc-067-cooling', 'cause', 3, 'Scale building up inside the coil', NULL),
  ('g-vpc-067-cooling', 'cause', 4, 'Cooling pump getting weak', NULL),
  ('g-vpc-067-cooling', 'cause', 5, 'Chiller overloaded or the plant water too warm', NULL)
ON CONFLICT DO NOTHING;

-- VPC-068 · Vacuum pump struggling to pull the vacuum
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-vpc-068-vacuum', 'VPC-068', 'VPC-068-vpc-vac-pump', 'Vacuum pump struggling to pull the vacuum', 'The vacuum pump takes longer than usual to empty the air from the mould chamber, or the chamber does not reach its usual low pressure. Castings can come out with holes or not fill.', 1)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-vpc-068-vacuum', 'reading', 1, 'Mould chamber pressure', 'VPC-068-P2'),
  ('g-vpc-068-vacuum', 'reading', 2, 'Vacuum pump suction pressure', 'VPC-068-P4'),
  ('g-vpc-068-vacuum', 'reading', 3, 'Vacuum pump motor current', 'VPC-068-E2'),
  ('g-vpc-068-vacuum', 'reading', 4, 'Vacuum pump housing temperature', 'VPC-068-T4'),
  ('g-vpc-068-vacuum', 'reading', 5, 'Vacuum pump vibration', 'VPC-068-V1'),
  ('g-vpc-068-vacuum', 'check', 1, 'Check the suction filter and hose for blockage', NULL),
  ('g-vpc-068-vacuum', 'check', 2, 'Check the mould chamber door seal for dirt or damage and that it closes fully', NULL),
  ('g-vpc-068-vacuum', 'check', 3, 'Check the vacuum pump oil level and condition', NULL),
  ('g-vpc-068-vacuum', 'check', 4, 'Close the empty chamber, shut off the pump and see how fast the pressure rises', NULL),
  ('g-vpc-068-vacuum', 'cause', 1, 'Worn vanes or rotor inside the vacuum pump', NULL),
  ('g-vpc-068-vacuum', 'cause', 2, 'Suction filter or line blocked', NULL),
  ('g-vpc-068-vacuum', 'cause', 3, 'Mould chamber seal leaking', NULL),
  ('g-vpc-068-vacuum', 'cause', 4, 'A shut-off valve not closing fully', NULL),
  ('g-vpc-068-vacuum', 'cause', 5, 'Vacuum pump oil old or low', NULL)
ON CONFLICT DO NOTHING;

-- VPC-068 · Cooling water too warm or flowing too little
INSERT INTO investigation_guides (id, machine_id, subassembly_ref_id, title, symptom, sort_order) VALUES
  ('g-vpc-068-cooling', 'VPC-068', 'VPC-068-vpc-cool-loop', 'Cooling water too warm or flowing too little', 'The cooling water for the melting coil is flowing less than usual or warming up more as it passes through the machine. The coil can overheat and the heater will cut out.', 2)
ON CONFLICT DO NOTHING;
INSERT INTO investigation_guide_items (guide_id, kind, sort_order, text, measurement_id) VALUES
  ('g-vpc-068-cooling', 'reading', 1, 'Cooling water flow', 'VPC-068-F1'),
  ('g-vpc-068-cooling', 'reading', 2, 'Cooling water temperature going in', 'VPC-068-T2'),
  ('g-vpc-068-cooling', 'reading', 3, 'Cooling water temperature coming out', 'VPC-068-T3'),
  ('g-vpc-068-cooling', 'reading', 4, 'Cooling water temperature rise through the machine', 'VPC-068-DT1'),
  ('g-vpc-068-cooling', 'reading', 5, 'Melting heater power', 'VPC-068-E1'),
  ('g-vpc-068-cooling', 'check', 1, 'Check the cooling water strainer and clean it', NULL),
  ('g-vpc-068-cooling', 'check', 2, 'Check the hoses for kinks and leaks', NULL),
  ('g-vpc-068-cooling', 'check', 3, 'Check the chiller is running and its supply temperature is normal', NULL),
  ('g-vpc-068-cooling', 'check', 4, 'Check the coil water channels for scale at the next service', NULL),
  ('g-vpc-068-cooling', 'cause', 1, 'Strainer blocked', NULL),
  ('g-vpc-068-cooling', 'cause', 2, 'A hose pinched or kinked', NULL),
  ('g-vpc-068-cooling', 'cause', 3, 'Scale building up inside the coil', NULL),
  ('g-vpc-068-cooling', 'cause', 4, 'Cooling pump getting weak', NULL),
  ('g-vpc-068-cooling', 'cause', 5, 'Chiller overloaded or the plant water too warm', NULL)
ON CONFLICT DO NOTHING;
