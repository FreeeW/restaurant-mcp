// Payroll Summary component
'use client'

import { Card } from '@/components/ui/Card'
import { mockEmployees } from '@/lib/mock-data'
import { DollarSign } from 'lucide-react'

export default function PayrollSummary() {
  const activeEmployees = mockEmployees.filter(e => e.active)
  const totalMonthlyHours = activeEmployees.reduce((sum, e) => sum + e.hoursThisMonth, 0)
  const totalMonthlyCost = activeEmployees.reduce((sum, e) => sum + (e.hoursThisMonth * e.hourlyRate), 0)
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Resumo da Folha de Pagamento</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{activeEmployees.length}</p>
          <p className="text-sm text-gray-600">Funcionários</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{totalMonthlyHours}h</p>
          <p className="text-sm text-gray-600">Total Horas</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">
            R$ {totalMonthlyCost.toLocaleString('pt-BR')}
          </p>
          <p className="text-sm text-gray-600">Total a Pagar</p>
        </div>
      </div>
      
      {/* Employee Details */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Detalhamento por Funcionário</h4>
        {activeEmployees.map((employee) => {
          const totalPay = employee.hoursThisMonth * employee.hourlyRate
          return (
            <div key={employee.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                <p className="text-xs text-gray-500">
                  {employee.code} • {employee.role}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  R$ {totalPay.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-500">
                  {employee.hoursThisMonth}h × R$ {employee.hourlyRate.toFixed(2)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Export Button */}
      <div className="mt-6 pt-6 border-t">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          <DollarSign className="w-4 h-4" />
          Exportar para Excel
        </button>
      </div>
    </Card>
  )
}
