-- Migration: Create unified labor data view
-- Combines form submissions and WhatsApp timesheet data for backward compatibility

CREATE OR REPLACE VIEW labor_data_unified AS
SELECT 
  'form' as source,
  fs.id as record_id,
  fs.owner_id,
  (fs.payload->>'code')::text as employee_code,
  (fs.payload->>'date')::date as work_date,
  (fs.payload->>'hours')::decimal(5,2) as hours_worked,
  (fs.payload->>'hourly_rate')::decimal(10,2) as hourly_rate,
  (fs.payload->>'labour_cost')::decimal(10,2) as labor_cost,
  fs.submitted_at as recorded_at,
  fs.submitted_by_phone as submitted_by,
  NULL::timestamptz as check_in,
  NULL::timestamptz as check_out,
  'present'::text as status
FROM form_submissions fs
WHERE fs.source_form = 'mao_de_obra'
  AND fs.payload->>'code' IS NOT NULL
  AND fs.payload->>'date' IS NOT NULL

UNION ALL

SELECT 
  'whatsapp' as source,
  et.id as record_id,
  et.owner_id,
  e.code as employee_code,
  et.date as work_date,
  et.actual_hours as hours_worked,
  e.hourly_rate,
  et.labor_cost,
  et.created_at as recorded_at,
  e.phone_e164 as submitted_by,
  et.check_in,
  et.check_out,
  et.status
FROM employee_timesheet et
JOIN employees e ON e.id = et.employee_id
WHERE et.status = 'present'
  AND et.actual_hours IS NOT NULL;

-- Add comment
COMMENT ON VIEW labor_data_unified IS 'Unified view of labor data from both form submissions and WhatsApp check-ins';

-- Create a materialized view for better performance (optional)
-- This can be refreshed periodically for reporting
CREATE MATERIALIZED VIEW IF NOT EXISTS labor_data_summary AS
SELECT 
  owner_id,
  work_date,
  COUNT(DISTINCT employee_code) as employees_worked,
  SUM(hours_worked) as total_hours,
  SUM(labor_cost) as total_labor_cost,
  AVG(hours_worked) as avg_hours_per_employee,
  source
FROM labor_data_unified
GROUP BY owner_id, work_date, source;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_labor_summary_date ON labor_data_summary(owner_id, work_date);

-- Add comment
COMMENT ON MATERIALIZED VIEW labor_data_summary IS 'Daily summary of labor data for quick reporting';

-- Create refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_labor_data_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY labor_data_summary;
END;
$$ LANGUAGE plpgsql;
