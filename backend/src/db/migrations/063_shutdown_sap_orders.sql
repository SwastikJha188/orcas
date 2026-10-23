-- =============================================================================
-- 063 · A shutdown's work list goes to SAP as maintenance orders
--
-- One order per machine and shutdown (the machine's SAP equipment), one
-- operation per work item. The write goes through the SAP outbox like a
-- notification; the outbox row names the shutdown it came from, so the
-- shutdown shows each machine's order number, or why it was not created.
-- =============================================================================

UPDATE sap_resources SET write_action = 'order.create' WHERE id = 'maintenanceOrders' AND write_action IS NULL;

ALTER TABLE sap_outbox ADD COLUMN IF NOT EXISTS shutdown_id INTEGER REFERENCES shutdowns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sap_outbox_shutdown ON sap_outbox (shutdown_id) WHERE shutdown_id IS NOT NULL;
