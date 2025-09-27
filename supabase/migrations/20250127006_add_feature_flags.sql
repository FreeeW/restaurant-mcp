-- Migration: Add feature flags for gradual rollout
-- Allows controlling which input method to use per restaurant

-- Add feature flag to owners table
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS employee_check_mode TEXT DEFAULT 'form' 
  CHECK (employee_check_mode IN ('form', 'whatsapp', 'both'));

-- Add comment
COMMENT ON COLUMN owners.employee_check_mode IS 'Employee time tracking mode: form (Google Forms only), whatsapp (WhatsApp only), both (accept both methods)';

-- Default all existing owners to 'form' to maintain current behavior
UPDATE owners 
SET employee_check_mode = 'form' 
WHERE employee_check_mode IS NULL;

-- Add configuration for employee reminders
ALTER TABLE owners
ADD COLUMN IF NOT EXISTS employee_reminder_time TIME DEFAULT '07:30:00',
ADD COLUMN IF NOT EXISTS employee_reminder_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN owners.employee_reminder_time IS 'Time to send daily check-in reminder to employees';
COMMENT ON COLUMN owners.employee_reminder_enabled IS 'Whether to send daily reminders to employees';

-- Create helper function to check if employee can use WhatsApp
CREATE OR REPLACE FUNCTION can_employee_use_whatsapp(
  p_owner_id UUID,
  p_phone_e164 TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_mode TEXT;
  v_employee_exists BOOLEAN;
BEGIN
  -- Get owner's mode
  SELECT employee_check_mode INTO v_mode
  FROM owners
  WHERE id = p_owner_id;
  
  -- If mode is 'form', WhatsApp is not allowed
  IF v_mode = 'form' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if employee exists with this phone
  SELECT EXISTS(
    SELECT 1 FROM employees 
    WHERE owner_id = p_owner_id 
    AND phone_e164 = p_phone_e164 
    AND active = true
  ) INTO v_employee_exists;
  
  RETURN v_employee_exists;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_employee_use_whatsapp IS 'Check if an employee can use WhatsApp for time tracking based on owner settings';
