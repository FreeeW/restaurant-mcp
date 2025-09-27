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

export interface Employee {
  id: string
  owner_id: string
  code: string
  name: string
  hourly_rate: number
  active: boolean
  phone_e164?: string
  contract_type?: string
  monthly_salary?: number
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
        owner_id: ownerId,
        day: date
      })
    
    if (error) {
      console.error('Error fetching daily KPI:', error)
      return null
    }
    
    // Transform the data to match our interface
    if (data) {
      return {
        date: date,
        sales: data.sales || 0,
        orders: data.orders || 0,
        average_ticket: data.average_ticket || 0,
        food_cost: data.food_cost || 0,
        food_cost_percentage: data.food_percentage || 0,
        labor_cost: data.labour_cost || 0,
        labor_cost_percentage: data.labour_percentage || 0,
        profit: (data.sales || 0) - (data.food_cost || 0) - (data.labour_cost || 0),
        profit_margin: data.sales > 0 
          ? ((data.sales - data.food_cost - data.labour_cost) / data.sales) * 100 
          : 0
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
        owner_id: ownerId,
        start: startDate,
        end: endDate
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
        owner_id: ownerId,
        start: startDate,
        end: endDate
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
  }
}
