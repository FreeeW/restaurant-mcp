-- Migration: Create pending check-ins table
-- Temporary storage for check-in/out attempts, useful for debugging and audit

CREATE TABLE IF NOT EXISTS pending_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  owner_id UUID REFERENCES owners(id),
  phone_e164 TEXT NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('in', 'out')),
  message_text TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE pending_checkins IS 'Audit log for all check-in/out attempts via WhatsApp';
COMMENT ON COLUMN pending_checkins.employee_id IS 'NULL if phone not found in employees table';
COMMENT ON COLUMN pending_checkins.phone_e164 IS 'Phone number that sent the message';
COMMENT ON COLUMN pending_checkins.check_type IS 'Type of check: in (entrada) or out (saída)';
COMMENT ON COLUMN pending_checkins.message_text IS 'Original message text from WhatsApp';
COMMENT ON COLUMN pending_checkins.processed IS 'Whether this check-in was successfully processed';
COMMENT ON COLUMN pending_checkins.error_message IS 'Error message if processing failed';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_checkins_phone ON pending_checkins(phone_e164, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_checkins_unprocessed ON pending_checkins(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_pending_checkins_date ON pending_checkins(created_at);

-- Auto-cleanup old records after 30 days (optional, can be adjusted)
CREATE OR REPLACE FUNCTION cleanup_old_pending_checkins()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_checkins
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND processed = true;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old records (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cleanup-old-checkins', '0 2 * * *', 'SELECT cleanup_old_pending_checkins();');
