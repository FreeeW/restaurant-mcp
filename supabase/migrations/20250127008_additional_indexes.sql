-- Migration: Additional indexes and constraints for employee WhatsApp tracking
-- This migration adds extra optimizations and constraints for better performance

-- Ensure unique phone numbers per owner (one phone can't belong to multiple employees of same owner)
ALTER TABLE employees 
ADD CONSTRAINT unique_phone_per_owner 
UNIQUE (owner_id, phone_e164);

-- Add index for finding employee by phone quickly (partial index for active employees only)
DROP INDEX IF EXISTS idx_employees_phone;
CREATE INDEX idx_employees_phone_active 
ON employees(phone_e164) 
WHERE phone_e164 IS NOT NULL AND active = true;

-- Add composite index for timesheet queries by date range
CREATE INDEX IF NOT EXISTS idx_timesheet_date_range 
ON employee_timesheet(owner_id, date DESC, status);

-- Add index for finding today's incomplete check-ins (employees who haven't checked out)
CREATE INDEX IF NOT EXISTS idx_timesheet_incomplete 
ON employee_timesheet(date, employee_id) 
WHERE check_in IS NOT NULL AND check_out IS NULL;

-- Create function to get daily labor summary for dashboard
CREATE OR REPLACE FUNCTION get_daily_labor_summary(
  p_owner_id UUID,
  p_date DATE
) RETURNS TABLE (
  total_employees INTEGER,
  total_hours DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  avg_hours_per_employee DECIMAL(5,2),
  employees_present INTEGER,
  employees_absent INTEGER,
  overtime_hours DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT e.id)::INTEGER as total_employees,
    COALESCE(SUM(et.actual_hours), 0)::DECIMAL(10,2) as total_hours,
    COALESCE(SUM(et.labor_cost), 0)::DECIMAL(10,2) as total_cost,
    COALESCE(AVG(et.actual_hours), 0)::DECIMAL(5,2) as avg_hours_per_employee,
    COUNT(DISTINCT CASE WHEN et.status = 'present' THEN e.id END)::INTEGER as employees_present,
    COUNT(DISTINCT CASE WHEN et.status = 'absent' THEN e.id END)::INTEGER as employees_absent,
    COALESCE(SUM(et.overtime_hours), 0)::DECIMAL(10,2) as overtime_hours
  FROM employees e
  LEFT JOIN employee_timesheet et ON et.employee_id = e.id AND et.date = p_date
  WHERE e.owner_id = p_owner_id
  AND e.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-create timesheet entries for scheduled employees
-- This can be called by a cron job at the start of each day
CREATE OR REPLACE FUNCTION create_daily_timesheet_entries(
  p_owner_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_employee RECORD;
  v_weekday INTEGER;
BEGIN
  -- Get the weekday (0 = Sunday, 6 = Saturday)
  v_weekday := EXTRACT(DOW FROM p_date);
  
  -- Loop through employees with schedules for this weekday
  FOR v_employee IN
    SELECT DISTINCT e.id, e.owner_id, es.start_time, es.end_time
    FROM employees e
    JOIN employee_schedules es ON es.employee_id = e.id
    WHERE e.active = true
    AND es.active = true
    AND es.weekday = v_weekday
    AND (p_owner_id IS NULL OR e.owner_id = p_owner_id)
  LOOP
    -- Create timesheet entry if it doesn't exist
    INSERT INTO employee_timesheet (
      employee_id,
      owner_id,
      date,
      expected_hours,
      status
    ) VALUES (
      v_employee.id,
      v_employee.owner_id,
      p_date,
      EXTRACT(EPOCH FROM (v_employee.end_time - v_employee.start_time)) / 3600.0,
      'pending'
    )
    ON CONFLICT (employee_id, date) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_labor_summary TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION create_daily_timesheet_entries TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION get_daily_labor_summary IS 'Get aggregated labor metrics for a specific day';
COMMENT ON FUNCTION create_daily_timesheet_entries IS 'Pre-create timesheet entries for scheduled employees';
