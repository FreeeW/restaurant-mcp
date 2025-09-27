// Employees list page with real Supabase data
'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import EmployeeList from '@/components/employees/EmployeeList'
import EmployeeForm from '@/components/employees/EmployeeForm'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { owner } = useAuth()

  useEffect(() => {
    const loadEmployees = async () => {
      if (!owner?.id) return
      
      setLoading(true)
      setError(null)
      try {
        const data = await api.getEmployees(owner.id)
        setEmployees(data || [])
      } catch (error) {
        console.error('Error fetching employees:', error)
        setError('Erro ao carregar funcionários')
      } finally {
        setLoading(false)
      }
    }
    
    loadEmployees()
  }, [owner])

  const fetchEmployees = async () => {
    if (!owner?.id) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await api.getEmployees(owner.id)
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      setError('Erro ao carregar funcionários')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: any) => {
    try {
      if (editingEmployee) {
        // Update existing employee
        await api.updateEmployee(editingEmployee.id, {
          ...data,
          owner_id: owner?.id
        })
      } else {
        // Create new employee
        await api.createEmployee({
          ...data,
          owner_id: owner?.id
        })
      }
      
      // Refresh the list
      await fetchEmployees()
      
      // Close form
      setShowForm(false)
      setEditingEmployee(null)
    } catch (error) {
      console.error('Error saving employee:', error)
      setError('Erro ao salvar funcionário')
    }
  }

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      // In real implementation, we'd update the employee to set active = false
      await api.updateEmployee(id, { active: false })
      await fetchEmployees()
    } catch (error) {
      console.error('Error deleting employee:', error)
      setError('Erro ao excluir funcionário')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingEmployee(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando funcionários...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-gray-600">
            {employees.filter(e => e.active).length} funcionários ativos
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Funcionário
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
            <button 
              onClick={fetchEmployees}
              className="text-sm text-red-700 underline mt-1"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Form or List */}
      {showForm ? (
        <EmployeeForm 
          employee={editingEmployee}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <EmployeeList 
          employees={employees.filter(e => e.active)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
