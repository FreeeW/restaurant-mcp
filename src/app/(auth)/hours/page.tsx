// Hours tracking page with real Supabase data
'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Users, DollarSign, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'

export default function HoursPage() {
  const { owner } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState({
    totalHours: 0,
    totalCost: 0,
    employeeCount: 0
  })

  useEffect(() => {
    const loadShifts = async () => {
      if (!owner?.id) return
      
      setLoading(true)
      try {
        // Get week range
        const startOfWeek = new Date(selectedDate)
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        
        const startStr = startOfWeek.toISOString().split('T')[0]
        const endStr = endOfWeek.toISOString().split('T')[0]
        
        // Fetch shifts data
        const data = await api.getShifts(owner.id, startStr, endStr)
        
        if (data) {
          setShifts(data)
          
          // Calculate summary
          const totalHours = data.reduce((sum: number, item: any) => sum + (item.hours || 0), 0)
          const totalCost = data.reduce((sum: number, item: any) => sum + (item.total_pay || 0), 0)
          const employeeCount = new Set(data.map((item: any) => item.employee_code)).size
          
          setSummary({
            totalHours,
            totalCost,
            employeeCount
          })
        }
      } catch (error) {
        console.error('Error fetching shifts:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadShifts()
  }, [owner, selectedDate])

  const fetchShifts = async () => {
    if (!owner?.id) return
    
    setLoading(true)
    try {
      // Get week range
      const startOfWeek = new Date(selectedDate)
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      
      const startStr = startOfWeek.toISOString().split('T')[0]
      const endStr = endOfWeek.toISOString().split('T')[0]
      
      // Fetch shifts data
      const data = await api.getShifts(owner.id, startStr, endStr)
      
      if (data) {
        setShifts(data)
        
        // Calculate summary
        const totalHours = data.reduce((sum: number, item: any) => sum + (item.hours || 0), 0)
        const totalCost = data.reduce((sum: number, item: any) => sum + (item.total_pay || 0), 0)
        const employeeCount = new Set(data.map((item: any) => item.employee_code)).size
        
        setSummary({
          totalHours,
          totalCost,
          employeeCount
        })
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getWeekRange = () => {
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    return `${startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${endOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Horas Trabalhadas</h1>
        <p className="text-gray-600">Controle de ponto e custos com mão de obra</p>
      </div>

      {/* Date Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Semana: {getWeekRange()}</span>
          </div>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total de Horas</p>
          <p className="text-2xl font-bold text-gray-900">
            {summary.totalHours.toFixed(1)}h
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Custo Total</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.totalCost)}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Funcionários</p>
          <p className="text-2xl font-bold text-gray-900">
            {summary.employeeCount}
          </p>
        </Card>
      </div>

      {/* Shifts Table */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Detalhes por Funcionário</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-500 mt-2">Carregando dados...</p>
          </div>
        ) : shifts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funcionário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor/Hora
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shifts.map((shift, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {shift.employee_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {shift.employee_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {shift.hours?.toFixed(1) || '0.0'}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(shift.hourly_rate || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(shift.total_pay || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-sm font-medium text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {summary.totalHours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(summary.totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Nenhum registro de horas para esta semana</p>
          </div>
        )}
      </Card>
    </div>
  )
}
