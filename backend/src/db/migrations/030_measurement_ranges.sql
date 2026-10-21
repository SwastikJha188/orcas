-- =============================================================================
-- 030 · Design and operating ranges from the plant sensor list
--
-- One row per measurement from OSW-PE-SNL-PYR-01 Rev. 01 ("Pyro-Line Sensor
-- List, machine-wise register with design and operating ranges"), as printed:
-- the instrument (design) range, the nominal operating value or band, and the
-- four set-points LL / L / H / HH, in the document's unit. The numbers the
-- monitoring uses (in the measurement's own unit) are in measurement_limits,
-- measurements.range_lo / range_hi and normal_text; `basis` says how they were
-- converted where the units differ.
-- =============================================================================

CREATE TABLE IF NOT EXISTS measurement_ranges (
  measurement_id VARCHAR(128) PRIMARY KEY REFERENCES measurements(id) ON DELETE CASCADE,
  document VARCHAR(64) NOT NULL,
  doc_tag VARCHAR(64) NOT NULL,
  doc_unit VARCHAR(48) NOT NULL,
  design_text TEXT NOT NULL,
  nominal_text TEXT NOT NULL,
  ll_text VARCHAR(48) NOT NULL,
  l_text VARCHAR(48) NOT NULL,
  h_text VARCHAR(48) NOT NULL,
  hh_text VARCHAR(48) NOT NULL,
  status VARCHAR(16),
  remarks TEXT,
  design_lo DOUBLE PRECISION,
  design_hi DOUBLE PRECISION,
  nominal_lo DOUBLE PRECISION,
  nominal_hi DOUBLE PRECISION,
  ll DOUBLE PRECISION,
  l DOUBLE PRECISION,
  h DOUBLE PRECISION,
  hh DOUBLE PRECISION,
  conversion VARCHAR(8) NOT NULL CHECK (conversion IN ('same', 'mmwg', 'barg', 'pct', 'none')),
  basis TEXT
);
