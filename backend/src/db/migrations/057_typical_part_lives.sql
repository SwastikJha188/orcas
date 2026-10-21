-- =============================================================================
-- 057 · A part-life record for every part
--
-- Maintenance › Proactive lists each part's remaining life from
-- component_service_lives. Parts without a record get one from the typical
-- life for their kind of part (part_kind_lives, 055): the life and Weibull
-- shape of the kind, and the share already used estimated from the part's
-- latest health score (between full health and the health model's critical
-- band), against a running-hours counter of 0 like the existing estimates.
-- The plant's own service records replace these when it sends them.
-- =============================================================================

INSERT INTO component_service_lives (id, machine_id, subassembly_ref_id, name, basis, life, due_share, used, counter_h, installed, duty, record_source, sort_order, weibull_shape)
SELECT left(sy.machine_id, 24) || '-L' || lpad((row_number() OVER (PARTITION BY sy.machine_id ORDER BY sy.sort_order, x.sort_order))::text, 2, '0'),
       sy.machine_id,
       x.id,
       x.name,
       'h',
       k.life_h,
       0.9,
       round((k.life_h * greatest(0.02, least(0.95, coalesce((coalesce(mx.value, 100) - h.score) / nullif(coalesce(mx.value, 100) - cr.value, 0), 0.3))))::numeric, 0),
       0,
       NULL,
       NULL,
       'Estimated from the typical life of a ' || k.label || ': the plant has not sent its service records yet',
       100 + (row_number() OVER (PARTITION BY sy.machine_id ORDER BY sy.sort_order, x.sort_order))::int,
       k.weibull_shape
  FROM machine_subassemblies x
  JOIN machine_systems sy ON sy.id = x.machine_system_ref_id
  JOIN machines m ON m.id = sy.machine_id
  CROSS JOIN LATERAL (SELECT * FROM part_kind_lives WHERE x.name ~* name_pattern ORDER BY sort_order LIMIT 1) k
  LEFT JOIN LATERAL (SELECT score FROM subassembly_health_scores s WHERE s.subassembly_id = x.id ORDER BY scored_at DESC LIMIT 1) h ON true
  LEFT JOIN health_model_parameters mx ON mx.model_id = m.health_model_id AND mx.key = 'max_score'
  LEFT JOIN health_model_parameters cr ON cr.model_id = m.health_model_id AND cr.key = 'band_critical'
 WHERE NOT EXISTS (SELECT 1 FROM component_service_lives c WHERE c.subassembly_ref_id = x.id)
ON CONFLICT (id) DO NOTHING;
