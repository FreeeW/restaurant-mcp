// Employees list page
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import EmployeeList from '@/components/employees/EmployeeList'
import EmployeeForm from '@/components/employees/EmployeeForm'
import { mockEmployees } from '@/lib/mock-data'

export default function EmployeesPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-gray-600">Gerencie sua equipe</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>
      
      {/* Employee Form Modal */}
      {showForm && (
        <EmployeeForm 
          employee={editingEmployee}
          onClose={() => {
            setShowForm(false)
            setEditingEmployee(null)
          }}
          onSave={(data) => {
            console.log('Saving employee:', data)
            setShowForm(false)
            setEditingEmployee(null)
          }}
        />
      )}
      
      {/* Employee List */}
      <EmployeeList 
        employees={mockEmployees}
        onEdit={(employee) => {
          setEditingEmployee(employee)
          setShowForm(true)
        }}
      />
    </div>
  )
}
