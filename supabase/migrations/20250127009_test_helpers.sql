-- Migration: Helper functions for testing and debugging employee WhatsApp check-in
-- These functions help test the system without needing actual WhatsApp messages

-- Function to simulate employee check-in (for testing)
CREATE OR REPLACE FUNCTION simulate_employee_checkin(
  p_employee_code TEXT,
  p_owner_id UUID,
  p_time TIME DEFAULT CURRENT_TIME
) RETURNS JSONB AS $$
DECLARE
  v_employee RECORD;
  v_timestamp TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Find employee
  SELECT * INTO v_employee
  FROM employees
  WHERE code = p_employee_code
  AND owner_id = p_owner_id
  AND active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Employee not found'
    );
  END IF;
  
  -- Build timestamp for today at specified time
  v_timestamp := CURRENT_DATE + p_time;
  
  -- Call the actual check-in function
  v_result := process_employee_checkin(
    COALESCE(v_employee.phone_e164, '5511999999999'),
    v_timestamp
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to simulate employee check-out (for testing)
CREATE OR REPLACE FUNCTION simulate_employee_checkout(
  p_employee_code TEXT,
  p_owner_id UUID,
  p_time TIME DEFAULT CURRENT_TIME
) RETURNS JSONB AS $$
DECLARE
  v_employee RECORD;
  v_timestamp TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Find employee
  SELECT * INTO v_employee
  FROM employees
  WHERE code = p_employee_code
  AND owner_id = p_owner_id
  AND active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Employee not found'
    );
  END IF;
  
  -- Build timestamp for today at specified time
  v_timestamp := CURRENT_DATE + p_time;
  
  -- Call the actual check-out function
  v_result := process_employee_checkout(
    COALESCE(v_employee.phone_e164, '5511999999999'),
    v_timestamp
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate sample WhatsApp numbers for existing employees
-- This is useful for testing - it generates fake WhatsApp numbers
CREATE OR REPLACE FUNCTION generate_sample_employee_phones(
  p_owner_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_employee RECORD;
  v_phone TEXT;
BEGIN
  FOR v_employee IN
    SELECT id, code
    FROM employees
    WHERE owner_id = p_owner_id
    AND phone_e164 IS NULL
    AND active = true
  LOOP
    -- Generate a sample phone number based on employee code
    v_phone := '551199999' || LPAD(
      (ASCII(SUBSTRING(v_employee.code, 1, 1)) * 100 + 
       COALESCE(ASCII(SUBSTRING(v_employee.code, 2, 1)), 0))::TEXT,
      4, '0'
    );
    
    UPDATE employees
    SET phone_e164 = v_phone
    WHERE id = v_employee.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get employee status for a specific date
CREATE OR REPLACE FUNCTION get_employee_status_for_date(
  p_owner_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  employee_code TEXT,
  employee_name TEXT,
  phone_e164 TEXT,
  status TEXT,
  check_in_time TIME,
  check_out_time TIME,
  hours_worked DECIMAL(5,2),
  labor_cost DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.code,
    e.name,
    e.phone_e164,
    COALESCE(et.status, 'not_scheduled')::TEXT,
    et.check_in::TIME,
    et.check_out::TIME,
    et.actual_hours,
    et.labor_cost
  FROM employees e
  LEFT JOIN employee_timesheet et ON et.employee_id = e.id AND et.date = p_date
  WHERE e.owner_id = p_owner_id
  AND e.active = true
  ORDER BY e.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for testing functions
GRANT EXECUTE ON FUNCTION simulate_employee_checkin TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION simulate_employee_checkout TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION generate_sample_employee_phones TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_employee_status_for_date TO service_role, authenticated;

-- Add comments
COMMENT ON FUNCTION simulate_employee_checkin IS 'Test function to simulate employee check-in without WhatsApp';
COMMENT ON FUNCTION simulate_employee_checkout IS 'Test function to simulate employee check-out without WhatsApp';
COMMENT ON FUNCTION generate_sample_employee_phones IS 'Generate fake WhatsApp numbers for testing';
COMMENT ON FUNCTION get_employee_status_for_date IS 'Get all employees status for a specific date';
