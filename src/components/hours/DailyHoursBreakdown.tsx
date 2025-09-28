// Daily Hours Breakdown component
'use client'

import { Clock, DollarSign, User } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { generateDailyHours } from '@/lib/mock-data'

interface DailyHoursBreakdownProps {
  date: Date
}

export default function DailyHoursBreakdown({ date }: DailyHoursBreakdownProps) {
  const hoursData = generateDailyHours(date)
  
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    return date.toLocaleDateString('pt-BR', options)
  }
  
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Horas do Dia</h3>
        <p className="text-sm text-gray-600">{formatDate(date)}</p>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Total Horas</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{hoursData.totalHours}h</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Custo Total</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              R$ {hoursData.totalCost.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
        
        {/* Employee List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Funcionários ({hoursData.employees.length})</h4>
          {hoursData.employees.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum funcionário registrado neste dia
            </p>
          ) : (
            hoursData.employees.map((emp: any) => (
              <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{emp.hours}h</p>
                  <p className="text-xs text-gray-600">
                    R$ {emp.total.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
