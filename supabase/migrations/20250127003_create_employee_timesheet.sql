-- Migration: Create employee timesheet table
-- Records actual check-in/out times and calculated hours/costs

CREATE TABLE IF NOT EXISTS employee_timesheet (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  owner_id UUID NOT NULL REFERENCES owners(id),
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  expected_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent', 'holiday', 'sick', 'off')),
  labor_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Add comments
COMMENT ON TABLE employee_timesheet IS 'Daily time tracking for employees via WhatsApp check-in/out';
COMMENT ON COLUMN employee_timesheet.date IS 'The work date (not timestamp)';
COMMENT ON COLUMN employee_timesheet.check_in IS 'Actual check-in timestamp from WhatsApp';
COMMENT ON COLUMN employee_timesheet.check_out IS 'Actual check-out timestamp from WhatsApp';
COMMENT ON COLUMN employee_timesheet.expected_hours IS 'Expected hours based on schedule';
COMMENT ON COLUMN employee_timesheet.actual_hours IS 'Calculated hours between check-in and check-out';
COMMENT ON COLUMN employee_timesheet.overtime_hours IS 'Hours beyond expected (if actual > expected)';
COMMENT ON COLUMN employee_timesheet.status IS 'Status: pending (not arrived), present (checked in), absent, holiday, sick, off (day off)';
COMMENT ON COLUMN employee_timesheet.labor_cost IS 'Calculated cost based on hours and rate/salary';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_timesheet_date ON employee_timesheet(owner_id, date);
CREATE INDEX IF NOT EXISTS idx_timesheet_employee ON employee_timesheet(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_timesheet_status ON employee_timesheet(owner_id, date, status);

-- Create updated_at trigger
CREATE TRIGGER update_employee_timesheet_updated_at
  BEFORE UPDATE ON employee_timesheet
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE employee_timesheet ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role has full access to timesheet"
  ON employee_timesheet
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
