-- Migration: Add WhatsApp and employment type fields to employees table
-- This allows employees to check in/out via WhatsApp instead of forms

-- Add new columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'hourly' CHECK (contract_type IN ('hourly', 'clt', 'daily'));

-- Add comment for clarity
COMMENT ON COLUMN employees.phone_e164 IS 'WhatsApp number in E164 format (e.g., 5511999999999)';
COMMENT ON COLUMN employees.monthly_salary IS 'Monthly salary for CLT employees';
COMMENT ON COLUMN employees.contract_type IS 'Employment type: hourly (paid per hour), clt (fixed monthly salary), daily (paid per day)';

-- Create index for phone lookup (crucial for WhatsApp message processing)
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone_e164) WHERE phone_e164 IS NOT NULL;

-- Create index for active employees lookup
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(owner_id, active) WHERE active = true;
