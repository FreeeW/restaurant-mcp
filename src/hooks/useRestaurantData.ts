// Hook for managing restaurant data
// This will be the integration point with Supabase
'use client'

import { useState, useEffect } from 'react'
import { mockRestaurants, mockEmployees, Employee } from '@/lib/mock-data'

// This will be replaced with Supabase client
// import { supabase } from '@/lib/supabase'

export function useRestaurantData() {
  const [restaurant, setRestaurant] = useState(mockRestaurants[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRestaurantSettings = async (settings: typeof mockRestaurants[0]) => {
    setLoading(true)
    try {
      // TODO: Replace with Supabase update
      // const { data, error } = await supabase
      //   .from('owners')
      //   .update({
      //     business_name: settings.name,
      //     email: settings.email,
      //     phone_e164: settings.phone,
      //     manager_phone_e164: settings.managerPhone,
      //     closing_time: settings.closingTime,
      //     closing_reminder_enabled: settings.closingReminderEnabled,
      //     employee_check_mode: settings.employeeCheckMode,
      //     employee_reminder_time: settings.employeeReminderTime,
      //     employee_reminder_enabled: settings.employeeReminderEnabled
      //   })
      //   .eq('id', restaurant.id)
      
      // Mock update
      setRestaurant(settings)
      console.log('Updated settings:', settings)
      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      return { success: false, error: err }
    } finally {
      setLoading(false)
    }
  }

  return {
    restaurant,
    loading,
    error,
    updateRestaurantSettings
  }
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    setLoading(true)
    try {
      // TODO: Replace with Supabase update
      // const { data: updated, error } = await supabase
      //   .from('employees')
      //   .update({
      //     name: data.name,
      //     code: data.code,
      //     hourly_rate: data.hourlyRate,
      //     phone_e164: data.phoneWhatsApp,
      //     contract_type: data.contractType,
      //     monthly_salary: data.monthlySalary,
      //     active: data.active
      //   })
      //   .eq('id', id)
      
      // Mock update
      setEmployees(prev => 
        prev.map(emp => emp.id === id ? { ...emp, ...data } : emp)
      )
      console.log('Updated employee:', { id, data })
      return { success: true }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee')
      return { success: false, error: err }
    } finally {
      setLoading(false)
    }
  }

  const createEmployee = async (data: Partial<Employee>) => {
    setLoading(true)
    try {
      // TODO: Replace with Supabase insert
      // const { data: created, error } = await supabase
      //   .from('employees')
      //   .insert({
      //     owner_id: restaurant.id,
      //     name: data.name,
      //     code: data.code,
      //     hourly_rate: data.hourlyRate,
      //     phone_e164: data.phoneWhatsApp,
      //     contract_type: data.contractType,
      //     monthly_salary: data.monthlySalary,
      //     active: data.active
      //   })
      
      // Mock create
      const newEmployee = {
        ...data,
        id: Date.now().toString(),
        hoursThisMonth: 0
      } as Employee
      
      setEmployees(prev => [...prev, newEmployee])
      console.log('Created employee:', newEmployee)
      return { success: true, data: newEmployee }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
      return { success: false, error: err }
    } finally {
      setLoading(false)
    }
  }

  return {
    employees,
    loading,
    error,
    updateEmployee,
    createEmployee
  }
}
