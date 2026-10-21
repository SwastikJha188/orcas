-- =============================================================================
-- 050 · Demo request notifications
--
-- Each new demo request is emailed to OSWAR/teck (DEMO_REQUEST_NOTIFY_TO).
-- notified_at is set once the mail server accepted the email; notify_error
-- keeps the last reason it was not sent (no SMTP settings, server refused).
-- =============================================================================

ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS notify_error TEXT;
