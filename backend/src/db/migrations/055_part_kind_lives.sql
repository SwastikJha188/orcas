-- =============================================================================
-- 055 · Typical life per kind of part
--
-- Prognosis needs a time left and a chance of failure for every part, also
-- while no reading is moving toward its limit. A part's life then comes from
--   1. its own record in component_service_lives (the plant's data), else
--   2. the typical life for its kind of part (this table), matched on the
--      sub-assembly's name; the first pattern in sort order that matches wins.
-- `life_h` is the characteristic life (running hours by which 63 % of such
-- parts have failed) and `weibull_shape` how wear-out shaped the failures are
-- (1 = random, above 2 = wear-out). Both are typical values, assumed until
-- the plant records its own; the page says which one an estimate used.
-- =============================================================================

CREATE TABLE IF NOT EXISTS part_kind_lives (
  id VARCHAR(32) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  name_pattern TEXT NOT NULL,
  life_h REAL NOT NULL CHECK (life_h > 0),
  weibull_shape REAL NOT NULL CHECK (weibull_shape > 0),
  source TEXT NOT NULL,
  sort_order SMALLINT NOT NULL
);

ALTER TABLE component_service_lives ADD COLUMN IF NOT EXISTS weibull_shape REAL CHECK (weibull_shape > 0);

INSERT INTO part_kind_lives (id, label, name_pattern, life_h, weibull_shape, source, sort_order) VALUES
  ('lube',       'lubrication system',          '(lubrication|\mlube\M|\moil\M)', 20000, 1.2, 'Typical life for this kind of part (assumed)', 10),
  ('seal',       'seal',                        '(\mseals?\M|\mgland\M)', 25000, 1.4, 'Typical life for this kind of part (assumed)', 20),
  ('bearing',    'bearing or support',          '(bearing|trunnion|pedestal|\mtyres?\M|rollers|support station|\mstation\M|bushing)', 50000, 1.8, 'Typical life for this kind of part (assumed)', 30),
  ('gear',       'gear or gearbox',             '(gearbox|\mgears?\M|girth|reducer|pinion|clutch|crank|crosshead|eccentric)', 60000, 2.5, 'Typical life for this kind of part (assumed)', 40),
  ('motor',      'motor or drive',              '(motor|\mdrive\M)', 80000, 1.6, 'Typical life for this kind of part (assumed)', 50),
  ('fan',        'fan or blower',               '(\mfans?\M|blowers?|impeller)', 40000, 1.7, 'Typical life for this kind of part (assumed)', 60),
  ('pump',       'pump',                        '(pump|\mhpu\M|triplex)', 30000, 1.5, 'Typical life for this kind of part (assumed)', 70),
  ('actuator',   'valve, actuator or hydraulics', '(hydraulic|hydroset|cylinder|actuator|thrust|valve|solenoid|regulator|diaphragm)', 30000, 1.3, 'Typical life for this kind of part (assumed)', 80),
  ('filter',     'filter or filter bags',       '(\mbags?\M|filter|dust collector|baghouse)', 20000, 2.0, 'Typical life for this kind of part (assumed)', 90),
  ('conveying',  'conveying part',              '(belt|conveyor|elevator|pulley|air.slides?|feeder|\mgates?\M)', 30000, 2.0, 'Typical life for this kind of part (assumed)', 100),
  ('wear',       'wear part or lining',         '(refractory|lining|liner|crucible|concave|hammer|grate|compartment|burner|burning zone|\mhood\M|mantle|crushing)', 15000, 3.0, 'Typical life for this kind of part (assumed)', 110),
  ('electrical', 'electrical part',             '(generator|\mcoil\M|induction)', 50000, 1.4, 'Typical life for this kind of part (assumed)', 120),
  ('instrument', 'instrument or analyser',      '(analy[sz]er|scanner|meter|load cell|lvdt|instrument)', 45000, 1.0, 'Typical life for this kind of part (assumed)', 130),
  ('process',    'process part',                '(cooling|water|gas supply|\mmeal\M|calciner|tertiary|riser|cyclone|chamber|inlet|outlet|discharge)', 40000, 1.5, 'Typical life for this kind of part (assumed)', 140),
  ('structure',  'structure or casing',         '(shell|casing|volute|\msilo\M|\mbins?\M|hopper|stack|flask|\mbase\M|header|frame|shaft)', 120000, 3.0, 'Typical life for this kind of part (assumed)', 150),
  ('other',      'part',                        '.', 40000, 1.5, 'Typical life for this kind of part (assumed)', 999)
ON CONFLICT (id) DO NOTHING;
