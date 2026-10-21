/**
 * "Go and check" tasks for alarms (Maintenance › Predictive, migration 040).
 * Kept free of service imports: the server evaluation calls it inside its
 * transaction, the maintenance service before every read.
 */
import { query } from "@backend/db";

type Db = { query: (text: string, params?: unknown[]) => Promise<unknown> };

/**
 * Issues a check for every open alarm that has none: a limit crossed, or a
 * diagnostic pattern on a scored rule (not data quality, anomaly or service
 * life), on a machine with planned maintenance, at a severity that names a
 * check priority. A limit already covered by an open pattern on the same
 * machine, and an alarm whose earlier occurrence still has an unchecked task,
 * get no second task. Idempotent.
 */
export async function syncAlertChecks(db: Db = { query }): Promise<void> {
  await db.query(
    `INSERT INTO alert_checks (finding_id)
     SELECT f.id FROM findings f
       JOIN severities sv ON sv.id = f.severity_id AND sv.check_priority_id IS NOT NULL
       LEFT JOIN rules r ON r.id = f.rule_id
       LEFT JOIN rule_categories rc ON rc.id = r.category_id
      WHERE f.cleared_at IS NULL
        AND f.machine_id IN (SELECT machine_id FROM machine_maintenance_documents)
        AND (f.finding_type_id = 'limit_exceeded' OR (f.finding_type_id = 'rule_pattern' AND rc.scored))
        AND NOT (f.finding_type_id = 'limit_exceeded' AND EXISTS (
              SELECT 1 FROM findings g
                JOIN rules gr ON gr.id = g.rule_id
                JOIN rule_categories gc ON gc.id = gr.category_id AND gc.scored
                JOIN rule_inputs ri ON ri.rule_id = g.rule_id AND ri.measurement_id = f.measurement_id
               WHERE g.cleared_at IS NULL AND g.machine_id = f.machine_id AND g.finding_type_id = 'rule_pattern'))
        AND NOT EXISTS (
              SELECT 1 FROM alert_checks ac JOIN findings h ON h.id = ac.finding_id
               WHERE ac.result IS NULL AND h.machine_id = f.machine_id AND h.finding_type_id = f.finding_type_id
                 AND COALESCE(h.rule_id, 0) = COALESCE(f.rule_id, 0) AND COALESCE(h.measurement_id, '') = COALESCE(f.measurement_id, ''))
     ON CONFLICT (finding_id) DO NOTHING`,
  );
}
