-- Migration: Create employee schedules table
-- Stores the regular work schedule for each employee (e.g., Mon-Fri 8AM-5PM)

CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, weekday)
);

-- Add comments
COMMENT ON TABLE employee_schedules IS 'Regular work schedules for employees';
COMMENT ON COLUMN employee_schedules.weekday IS 'Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN employee_schedules.start_time IS 'Expected start time for this weekday';
COMMENT ON COLUMN employee_schedules.end_time IS 'Expected end time for this weekday';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee ON employee_schedules(employee_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_employee_schedules_owner ON employee_schedules(owner_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_schedules_updated_at
  BEFORE UPDATE ON employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
