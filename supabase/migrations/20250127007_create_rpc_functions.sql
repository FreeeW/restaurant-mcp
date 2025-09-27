-- Migration: Create RPC functions for employee time tracking
-- These functions will be called by edge functions for better security and consistency

-- Function to process employee check-in
CREATE OR REPLACE FUNCTION process_employee_checkin(
  p_phone_e164 TEXT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB AS $$
DECLARE
  v_employee RECORD;
  v_timesheet RECORD;
  v_today DATE;
  v_result JSONB;
BEGIN
  -- Get today's date
  v_today := DATE(p_timestamp AT TIME ZONE 'America/Sao_Paulo');
  
  -- Find employee by phone
  SELECT e.*, o.employee_check_mode, o.tz
  INTO v_employee
  FROM employees e
  JOIN owners o ON o.id = e.owner_id
  WHERE e.phone_e164 = p_phone_e164
  AND e.active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Número não cadastrado como funcionário ativo'
    );
  END IF;
  
  -- Check if WhatsApp is allowed for this owner
  IF v_employee.employee_check_mode = 'form' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_allowed',
      'message', 'Use o formulário para registrar ponto'
    );
  END IF;
  
  -- Check if already checked in today
  SELECT * INTO v_timesheet
  FROM employee_timesheet
  WHERE employee_id = v_employee.id
  AND date = v_today;
  
  IF FOUND AND v_timesheet.check_in IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_in',
      'message', format('Você já registrou entrada às %s', 
        TO_CHAR(v_timesheet.check_in AT TIME ZONE v_employee.tz, 'HH24:MI'))
    );
  END IF;
  
  -- Create or update timesheet record
  INSERT INTO employee_timesheet (
    employee_id,
    owner_id,
    date,
    check_in,
    status
  ) VALUES (
    v_employee.id,
    v_employee.owner_id,
    v_today,
    p_timestamp,
    'present'
  )
  ON CONFLICT (employee_id, date)
  DO UPDATE SET
    check_in = p_timestamp,
    status = 'present',
    updated_at = NOW();
  
  -- Log in pending_checkins for audit
  INSERT INTO pending_checkins (
    employee_id,
    owner_id,
    phone_e164,
    check_type,
    timestamp,
    processed,
    processed_at
  ) VALUES (
    v_employee.id,
    v_employee.owner_id,
    p_phone_e164,
    'in',
    p_timestamp,
    true,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'employee_name', v_employee.name,
    'check_time', TO_CHAR(p_timestamp AT TIME ZONE v_employee.tz, 'HH24:MI'),
    'message', format('✅ Entrada registrada - %s às %s', 
      v_employee.name,
      TO_CHAR(p_timestamp AT TIME ZONE v_employee.tz, 'HH24:MI'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process employee check-out
CREATE OR REPLACE FUNCTION process_employee_checkout(
  p_phone_e164 TEXT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB AS $$
DECLARE
  v_employee RECORD;
  v_timesheet RECORD;
  v_today DATE;
  v_hours_worked DECIMAL(5,2);
  v_labor_cost DECIMAL(10,2);
  v_overtime DECIMAL(5,2);
BEGIN
  -- Get today's date
  v_today := DATE(p_timestamp AT TIME ZONE 'America/Sao_Paulo');
  
  -- Find employee by phone
  SELECT e.*, o.employee_check_mode, o.tz
  INTO v_employee
  FROM employees e
  JOIN owners o ON o.id = e.owner_id
  WHERE e.phone_e164 = p_phone_e164
  AND e.active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Número não cadastrado como funcionário ativo'
    );
  END IF;
  
  -- Check if WhatsApp is allowed for this owner
  IF v_employee.employee_check_mode = 'form' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_allowed',
      'message', 'Use o formulário para registrar ponto'
    );
  END IF;
  
  -- Get today's timesheet
  SELECT * INTO v_timesheet
  FROM employee_timesheet
  WHERE employee_id = v_employee.id
  AND date = v_today;
  
  IF NOT FOUND OR v_timesheet.check_in IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_checkin',
      'message', '❌ Você precisa registrar entrada primeiro'
    );
  END IF;
  
  IF v_timesheet.check_out IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_checked_out',
      'message', format('Você já registrou saída às %s', 
        TO_CHAR(v_timesheet.check_out AT TIME ZONE v_employee.tz, 'HH24:MI'))
    );
  END IF;
  
  -- Calculate hours worked
  v_hours_worked := EXTRACT(EPOCH FROM (p_timestamp - v_timesheet.check_in)) / 3600.0;
  v_hours_worked := ROUND(v_hours_worked, 2);
  
  -- Calculate overtime (over 8 hours)
  v_overtime := GREATEST(0, v_hours_worked - 8);
  
  -- Calculate labor cost
  IF v_employee.contract_type = 'clt' AND v_employee.monthly_salary IS NOT NULL THEN
    -- For CLT: daily cost = monthly salary / 30
    v_labor_cost := (v_employee.monthly_salary / 30.0) * (v_hours_worked / 8.0);
  ELSE
    -- For hourly workers
    v_labor_cost := v_hours_worked * v_employee.hourly_rate;
  END IF;
  
  -- Update timesheet
  UPDATE employee_timesheet SET
    check_out = p_timestamp,
    actual_hours = v_hours_worked,
    overtime_hours = v_overtime,
    labor_cost = v_labor_cost,
    status = 'present',
    updated_at = NOW()
  WHERE id = v_timesheet.id;
  
  -- Create form_submission for backward compatibility
  INSERT INTO form_submissions (
    owner_id,
    source_form,
    payload,
    submitted_by_phone,
    submitted_at
  ) VALUES (
    v_employee.owner_id,
    'mao_de_obra',
    jsonb_build_object(
      'code', v_employee.code,
      'date', v_today,
      'hours', v_hours_worked,
      'hourly_rate', v_employee.hourly_rate,
      'labour_cost', v_labor_cost
    ),
    p_phone_e164,
    NOW()
  );
  
  -- Log in pending_checkins for audit
  INSERT INTO pending_checkins (
    employee_id,
    owner_id,
    phone_e164,
    check_type,
    timestamp,
    processed,
    processed_at
  ) VALUES (
    v_employee.id,
    v_employee.owner_id,
    p_phone_e164,
    'out',
    p_timestamp,
    true,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'employee_name', v_employee.name,
    'check_in_time', TO_CHAR(v_timesheet.check_in AT TIME ZONE v_employee.tz, 'HH24:MI'),
    'check_out_time', TO_CHAR(p_timestamp AT TIME ZONE v_employee.tz, 'HH24:MI'),
    'hours_worked', v_hours_worked,
    'overtime_hours', v_overtime,
    'labor_cost', v_labor_cost,
    'message', format('✅ Saída registrada - %s%sTotal: %s horas', 
      v_employee.name,
      E'\n',
      ROUND(v_hours_worked, 1))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION process_employee_checkin TO service_role;
GRANT EXECUTE ON FUNCTION process_employee_checkout TO service_role;
