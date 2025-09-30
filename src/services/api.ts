// API Service Layer - All Supabase queries in one place
import { supabase } from '@/lib/supabase'

// Types
export interface DailyKPI {
  date: string
  sales: number
  orders: number
  average_ticket: number
  food_cost: number
  food_cost_percentage: number
  labor_cost: number
  labor_cost_percentage: number
  profit: number
  profit_margin: number
}

export interface EnhancedDailyKPI extends DailyKPI {
  // Original daily purchase data
  actual_purchases?: number
  
  // Rolling average data (more accurate)
  rolling_cmv_percentage: number
  rolling_period_days: number
  
  // Theoretical values based on rolling average
  theoretical_food_cost: number
  
  // Indicators
  is_purchase_day: boolean
  cmv_variance?: number
}

export interface Employee {
  id: string
  owner_id: string
  code: string
  name: string
  hourly_rate: number
  active: boolean
  phone_e164?: string
  contract_type?: 'hourly' | 'clt' | 'daily'
  monthly_salary?: number
  // Additional fields used by frontend components
  email?: string
  role?: string
  phone?: string
  hours_this_month?: number
}

export interface Supplier {
  id: string
  owner_id: string
  name: string
  cnpj?: string
  category: string
  phone?: string
  email?: string
  contact?: string
  active: boolean
  // Note: phone and email fields match both database and frontend expectations
}

export interface FixedCost {
  id: string
  owner_id: string
  name: string
  category: string
  amount: number
  frequency: string
  due_day?: number
  active: boolean
}

// API Functions
export const api = {
  // Owner/Restaurant
  getOwnerInfo: async (ownerId: string) => {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .eq('id', ownerId)
      .single()
    
    if (error) throw error
    return data
  },

  updateOwnerSettings: async (ownerId: string, updates: any) => {
    const { data, error } = await supabase
      .from('owners')
      .update(updates)
      .eq('id', ownerId)
      .single()
    
    if (error) throw error
    return data
  },

  // Employees
  getEmployees: async (ownerId: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('owner_id', ownerId)
      .order('name', { ascending: true })
    
    if (error) throw error
    return data as Employee[]
  },

  createEmployee: async (employee: Partial<Employee>) => {
    const { data, error } = await supabase
      .from('employees')
      .insert(employee)
      .single()
    
    if (error) throw error
    return data
  },

  updateEmployee: async (id: string, updates: Partial<Employee>) => {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  deleteEmployee: async (id: string) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // KPIs
  getDailyKPI: async (ownerId: string, date: string): Promise<DailyKPI | null> => {
    const { data, error } = await supabase
      .rpc('get_daily_kpi_on_date', {
        p_owner: ownerId,
        p_day: date
      })
    
    if (error) {
      console.error('Error fetching daily KPI:', error)
      return null
    }
    
    // Transform the data to match our interface
    if (data) {
      return {
        date: date,
        sales: data.net_sales || 0,
        orders: data.orders || 0,
        average_ticket: data.average_ticket || 0,
        food_cost: data.food_cost || 0,
        food_cost_percentage: (data.food_pct || 0) * 100,
        labor_cost: data.labour_cost || 0,
        labor_cost_percentage: (data.labour_pct || 0) * 100,
        profit: (data.net_sales || 0) - (data.food_cost || 0) - (data.labour_cost || 0),
        profit_margin: data.net_sales > 0 
          ? ((data.net_sales - data.food_cost - data.labour_cost) / data.net_sales) * 100 
          : 0
      }
    }
    
    return null
  },

  // Enhanced KPI with rolling CMV
  getDailyKPIEnhanced: async (
    ownerId: string, 
    date: string,
    rollingDays: number = 30
  ): Promise<EnhancedDailyKPI | null> => {
    // First get the regular daily KPI
    const basicKPI = await api.getDailyKPI(ownerId, date)
    
    // Get rolling CMV data
    const { data: rollingData, error } = await supabase
      .rpc('get_rolling_cmv', {
        p_owner_id: ownerId,
        p_date: date,
        p_days: rollingDays
      })
    
    if (error) {
      console.error('Error fetching rolling CMV:', error)
      // If rolling fails but we have basic KPI, return it with defaults
      if (basicKPI) {
        return {
          ...basicKPI,
          actual_purchases: 0,
          rolling_cmv_percentage: basicKPI.food_cost_percentage,
          rolling_period_days: rollingDays,
          theoretical_food_cost: basicKPI.food_cost,
          is_purchase_day: false,
          cmv_variance: 0
        }
      }
      return null
    }
    
    const rolling = rollingData?.[0]
    
    // If no basic KPI but we have rolling data, create enhanced KPI from rolling
    if (!basicKPI && rolling) {
      return {
        date: date,
        sales: rolling.daily_sales || 0,
        orders: 0,
        average_ticket: 0,
        food_cost: rolling.theoretical_daily_food_cost || 0,
        food_cost_percentage: rolling.rolling_cmv_percentage || 0,
        labor_cost: 0,
        labor_cost_percentage: 0,
        profit: (rolling.daily_sales || 0) - (rolling.theoretical_daily_food_cost || 0),
        profit_margin: rolling.daily_sales > 0 
          ? ((rolling.daily_sales - rolling.theoretical_daily_food_cost) / rolling.daily_sales) * 100
          : 0,
        actual_purchases: rolling.daily_purchases || 0,
        rolling_cmv_percentage: rolling.rolling_cmv_percentage || 0,
        rolling_period_days: rollingDays,
        theoretical_food_cost: rolling.theoretical_daily_food_cost || 0,
        is_purchase_day: (rolling.daily_purchases || 0) > 0,
        cmv_variance: rolling.daily_purchases - rolling.theoretical_daily_food_cost
      }
    }
    
    // If we have both, merge them
    if (basicKPI && rolling) {
      return {
        ...basicKPI,
        actual_purchases: rolling.daily_purchases || 0,
        rolling_cmv_percentage: rolling.rolling_cmv_percentage || basicKPI.food_cost_percentage,
        rolling_period_days: rollingDays,
        theoretical_food_cost: rolling.theoretical_daily_food_cost || basicKPI.food_cost,
        is_purchase_day: (rolling.daily_purchases || 0) > 0,
        cmv_variance: rolling.daily_purchases - rolling.theoretical_daily_food_cost
      }
    }
    
    return null
  },

  getPeriodKPIs: async (ownerId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .rpc('get_period_kpis', {
        owner_id: ownerId,
        start: startDate,
        end: endDate
      })
    
    if (error) throw error
    return data
  },

  // Labor/Shifts
  getShifts: async (ownerId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .rpc('get_shifts_range', {
        owner_id: ownerId,
        start: startDate,
        end: endDate
      })
    
    if (error) throw error
    return data
  },

  getDailyLabor: async (ownerId: string, date: string) => {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('source_form', 'mao_de_obra')
      .gte('submitted_at', `${date}T00:00:00`)
      .lt('submitted_at', `${date}T23:59:59`)
      .order('submitted_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Sales
  getDailySales: async (ownerId: string, date: string) => {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('source_form', 'vendas')
      .gte('submitted_at', `${date}T00:00:00`)
      .lt('submitted_at', `${date}T23:59:59`)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
      console.error('Error fetching daily sales:', error)
    }
    return data
  },

  // Suppliers
  getSuppliers: async (ownerId: string) => {
    // For now, return empty array since suppliers table might not exist
    // In production, you would create this table
    return [] as Supplier[]
  },

  createSupplier: async (supplier: Partial<Supplier>) => {
    // Placeholder for when table is created
    return supplier
  },

  updateSupplier: async (id: string, updates: Partial<Supplier>) => {
    // Placeholder for when table is created
    return { id, ...updates }
  },

  // Fixed Costs
  getFixedCosts: async (ownerId: string) => {
    // For now, return empty array since fixed_costs table might not exist
    // In production, you would create this table
    return [] as FixedCost[]
  },

  createFixedCost: async (cost: Partial<FixedCost>) => {
    // Placeholder for when table is created
    return cost
  },

  updateFixedCost: async (id: string, updates: Partial<FixedCost>) => {
    // Placeholder for when table is created
    return { id, ...updates }
  },

  // Appointments/Events
  getAppointments: async (ownerId: string, startDate?: string, endDate?: string) => {
    let query = supabase
      .from('events')
      .select('*')
      .eq('owner_id', ownerId)
      .order('date', { ascending: true })
    
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching appointments:', error)
      return []
    }
    
    return data || []
  },

  createAppointment: async (appointment: any) => {
    const { data, error } = await supabase
      .from('events')
      .insert(appointment)
      .single()
    
    if (error) throw error
    return data
  },

  deleteAppointment: async (id: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Licenses
  getLicenses: async (ownerId: string) => {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('owner_id', ownerId)
      .order('expiry_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching licenses:', error)
      return []
    }
    
    return data || []
  },

  getExpiringLicenses: async (ownerId: string, daysAhead: number = 30) => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)
    
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('owner_id', ownerId)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching expiring licenses:', error)
      return []
    }
    
    return data || []
  },

  // Orders (Food purchases)
  getOrders: async (ownerId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .rpc('get_orders_range', {
        p_owner: ownerId,
        p_start: startDate,
        p_end: endDate
      })
    
    if (error) {
      console.error('Error fetching orders:', error)
      return []
    }
    
    return data || []
  },

  // Notes
  getNotes: async (ownerId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .rpc('get_notes_range', {
        p_owner: ownerId,
        p_start: startDate,
        p_end: endDate
      })
    
    if (error) {
      console.error('Error fetching notes:', error)
      return []
    }
    
    return data || []
  },

  // Employee Timesheet (for WhatsApp check-ins)
  getEmployeeTimesheet: async (ownerId: string, date: string) => {
    const { data, error } = await supabase
      .from('employee_timesheet')
      .select(`
        *,
        employees:employee_id(
          id,
          name,
          code,
          hourly_rate
        )
      `)
      .eq('owner_id', ownerId)
      .eq('date', date)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching timesheet:', error)
      return []
    }
    
    return data || []
  },

  // Unified labor data (combines form and WhatsApp data)
  getUnifiedLaborData: async (ownerId: string, date: string) => {
    const { data, error } = await supabase
      .from('labor_data_unified')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('work_date', date)
      .order('employee_code', { ascending: true })
    
    if (error) {
      console.error('Error fetching unified labor data:', error)
      return []
    }
    
    return data || []
  },

  // ============= NEW HOURS PAGE FUNCTIONS =============
  // Enhanced labor data with employee details and flexible filters
  getLaborData: async (
    ownerId: string, 
    startDate: string, 
    endDate: string,
    options?: {
      employeeCodes?: string[]
      groupBy?: 'none' | 'day' | 'employee' | 'week'
    }
  ) => {
    // Build the query
    let query = supabase
      .from('labor_data_unified')
      .select('*')
      .eq('owner_id', ownerId)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
    
    // Apply employee filter if provided
    if (options?.employeeCodes && options.employeeCodes.length > 0) {
      query = query.in('employee_code', options.employeeCodes)
    }
    
    // Apply sorting based on grouping
    if (options?.groupBy === 'day') {
      query = query.order('work_date', { ascending: false })
        .order('employee_code', { ascending: true })
    } else if (options?.groupBy === 'employee') {
      query = query.order('employee_code', { ascending: true })
        .order('work_date', { ascending: false })
    } else {
      query = query.order('work_date', { ascending: false })
        .order('employee_code', { ascending: true })
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching labor data:', error)
      return []
    }
    
    // Enhance with employee names from employees table
    if (data && data.length > 0) {
      // Get all unique employee codes
      const employeeCodes = [...new Set(data.map(d => d.employee_code))]
      
      // Fetch employee details
      const { data: employees } = await supabase
        .from('employees')
        .select('code, name, contract_type, active')
        .eq('owner_id', ownerId)
        .in('code', employeeCodes)
      
      // Create a map for quick lookup
      const employeeMap = new Map(
        employees?.map(e => [e.code, e]) || []
      )
      
      // Enhance labor data with employee names
      return data.map(record => ({
        ...record,
        employee_name: employeeMap.get(record.employee_code)?.name || record.employee_code,
        contract_type: employeeMap.get(record.employee_code)?.contract_type || 'hourly',
        is_active: employeeMap.get(record.employee_code)?.active !== false,
        // Calculate overtime (over 8 hours per day)
        overtime_hours: record.hours_worked > 8 ? record.hours_worked - 8 : 0,
        regular_hours: record.hours_worked > 8 ? 8 : record.hours_worked
      }))
    }
    
    return data || []
  },

  // Get labor summary for a period (KPIs for cards)
  getLaborSummary: async (ownerId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('labor_data_unified')
      .select('hours_worked, labor_cost, employee_code')
      .eq('owner_id', ownerId)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .eq('status', 'present') // Only count present employees
    
    if (error) {
      console.error('Error fetching labor summary:', error)
      return {
        totalHours: 0,
        totalCost: 0,
        uniqueEmployees: 0,
        averageHoursPerEmployee: 0,
        totalOvertimeHours: 0,
        averageDailyCost: 0
      }
    }
    
    if (!data || data.length === 0) {
      return {
        totalHours: 0,
        totalCost: 0,
        uniqueEmployees: 0,
        averageHoursPerEmployee: 0,
        totalOvertimeHours: 0,
        averageDailyCost: 0
      }
    }
    
    // Calculate metrics
    const totalHours = data.reduce((sum, r) => sum + Number(r.hours_worked || 0), 0)
    const totalCost = data.reduce((sum, r) => sum + Number(r.labor_cost || 0), 0)
    const uniqueEmployees = new Set(data.map(r => r.employee_code)).size
    const totalOvertimeHours = data.reduce((sum, r) => {
      const hours = Number(r.hours_worked || 0)
      return sum + (hours > 8 ? hours - 8 : 0)
    }, 0)
    
    // Calculate days in period for daily average
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    return {
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
      totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
      uniqueEmployees,
      averageHoursPerEmployee: uniqueEmployees > 0 
        ? Math.round((totalHours / uniqueEmployees) * 10) / 10 
        : 0,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      averageDailyCost: Math.round((totalCost / days) * 100) / 100
    }
  },

  // Get detailed data for a specific employee
  getEmployeeLaborDetail: async (
    ownerId: string, 
    employeeCode: string, 
    startDate: string, 
    endDate: string
  ) => {
    const { data, error } = await supabase
      .from('labor_data_unified')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('employee_code', employeeCode)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching employee detail:', error)
      return null
    }
    
    // Get employee info
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('code', employeeCode)
      .single()
    
    if (!data || data.length === 0) {
      return null
    }
    
    // Calculate totals and analytics
    const totalHours = data.reduce((sum, r) => sum + Number(r.hours_worked || 0), 0)
    const totalCost = data.reduce((sum, r) => sum + Number(r.labor_cost || 0), 0)
    const totalDays = data.filter(r => r.status === 'present').length
    const totalOvertimeHours = data.reduce((sum, r) => {
      const hours = Number(r.hours_worked || 0)
      return sum + (hours > 8 ? hours - 8 : 0)
    }, 0)
    
    return {
      employee: {
        code: employeeCode,
        name: employee?.name || employeeCode,
        hourly_rate: employee?.hourly_rate || 0,
        contract_type: employee?.contract_type || 'hourly',
        active: employee?.active !== false
      },
      summary: {
        totalHours: Math.round(totalHours * 10) / 10,
        totalCost: Math.round(totalCost * 100) / 100,
        totalDays,
        averageHoursPerDay: totalDays > 0 
          ? Math.round((totalHours / totalDays) * 10) / 10 
          : 0,
        totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10
      },
      dailyRecords: data.map(record => ({
        ...record,
        overtime_hours: record.hours_worked > 8 ? record.hours_worked - 8 : 0,
        regular_hours: record.hours_worked > 8 ? 8 : record.hours_worked
      }))
    }
  }
}
