-- =============================================================================
-- 018 · Edge registry in 3NF
--
-- * A point names its measurement only (measurement_id); the machine and the
--   measurement's tag come through it, so edge_points.machine_id / signal_tag
--   (copies) are removed.
-- * A gateway's extra topic filters are rows of edge_gateway_topics, not a
--   JSON array.
-- * v_edge_points / v_edge_gateways present the registry with those values
--   resolved, for reading.
-- =============================================================================

-- Points still linked only by machine + tag get their measurement first.
UPDATE edge_points p SET measurement_id = c.measurement_id
  FROM v_measurement_context c
 WHERE p.measurement_id IS NULL AND p.machine_id IS NOT NULL AND c.machine_id = p.machine_id AND c.tag = COALESCE(p.signal_tag, p.tag);

DROP INDEX IF EXISTS idx_edge_points_machine;
ALTER TABLE edge_points DROP COLUMN IF EXISTS machine_id;
ALTER TABLE edge_points DROP COLUMN IF EXISTS signal_tag;

CREATE OR REPLACE VIEW v_edge_points AS
SELECT p.*, c.machine_id, c.tag AS signal_tag
  FROM edge_points p
  LEFT JOIN v_measurement_context c ON c.measurement_id = p.measurement_id;

CREATE TABLE IF NOT EXISTS edge_gateway_topics (
  gateway_id VARCHAR(64) NOT NULL REFERENCES edge_gateways(id) ON DELETE CASCADE,
  filter VARCHAR(512) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (gateway_id, filter)
);

INSERT INTO edge_gateway_topics (gateway_id, filter, sort_order)
SELECT g.id, t.filter, (t.ord - 1)::smallint
  FROM edge_gateways g
  CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(g.topics, '[]'::jsonb)) WITH ORDINALITY AS t(filter, ord)
ON CONFLICT DO NOTHING;

ALTER TABLE edge_gateways DROP COLUMN IF EXISTS topics;

CREATE OR REPLACE VIEW v_edge_gateways AS
SELECT g.*,
       COALESCE((SELECT jsonb_agg(t.filter ORDER BY t.sort_order) FROM edge_gateway_topics t WHERE t.gateway_id = g.id), '[]'::jsonb) AS topics
  FROM edge_gateways g;
