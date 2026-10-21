-- =============================================================================
-- 026 · Finding types in everyday words (docs/plain-language.md)
-- =============================================================================

UPDATE finding_types SET name = 'Behaving differently than usual', description = 'Good readings differ from what is normal for how the machine is running' WHERE id = 'behaviour_deviation';
UPDATE finding_types SET name = 'Readings missing or not trusted', description = 'The readings are missing or not reliable enough to judge the machine' WHERE id = 'data_unavailable';
UPDATE finding_types SET name = 'Past its safe limit', description = 'A reading has crossed one of its set limits' WHERE id = 'limit_exceeded';
UPDATE finding_types SET name = 'Running in a new way', description = 'The machine is running in a way the system has no normal values for yet' WHERE id = 'new_operating_condition';
UPDATE finding_types SET name = 'Process target missed', description = 'A process reading is outside the value it should hold' WHERE id = 'process_requirement';
UPDATE finding_types SET name = 'Known problem pattern', description = 'Several readings together match a known problem' WHERE id = 'rule_pattern';
UPDATE finding_types SET name = 'Steadily changing', description = 'Good readings keep moving in one direction while the machine runs the same way' WHERE id = 'sustained_change';
