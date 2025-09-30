-- Migration: Add email, role, and phone fields to employees table
-- These fields are used by the frontend for employee management
-- Date: 2025-09-29

-- Add new columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add comments for clarity
COMMENT ON COLUMN employees.email IS 'Employee email address for communications';
COMMENT ON COLUMN employees.role IS 'Job role/position (e.g., Garçom, Cozinheiro, Caixa)';
COMMENT ON COLUMN employees.phone IS 'General phone number in any format (alternative to phone_e164)';

-- Create index for email lookup (useful for user management)
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE email IS NOT NULL;

-- Create index for role filtering
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(owner_id, role) WHERE role IS NOT NULL;
