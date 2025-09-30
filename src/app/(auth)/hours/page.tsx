// Hours page - Complete rebuild with real data and intuitive interface
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import FilterBar from '@/components/hours/FilterBar'
import SummaryCards from '@/components/hours/SummaryCards'
import LaborDataTable from '@/components/hours/LaborDataTable'
import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default function HoursPage() {
  const { owner } = useAuth()
  
  // State management
  const [laborData, setLaborData] = useState<any[]>([])
  const [summary, setSummary] = useState({
    totalHours: 0,
    totalCost: 0,
    uniqueEmployees: 0,
    averageHoursPerEmployee: 0,
    totalOvertimeHours: 0,
    averageDailyCost: 0
  })
  const [employees, setEmployees] = useState<{ code: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [filters, setFilters] = useState<{
    startDate: string
    endDate: string
    periodType: 'day' | 'week' | 'month' | 'custom'
    employeeCodes?: string[]
  }>({
    startDate: '',
    endDate: '',
    periodType: 'week',
    employeeCodes: undefined
  })

  // Load employees on mount
  useEffect(() => {
    const loadEmployees = async () => {
      if (!owner?.id) return
      
      try {
        const data = await api.getEmployees(owner.id)
        if (data) {
          setEmployees(
            data
              .filter(e => e.active)
              .map(e => ({ code: e.code, name: e.name }))
          )
        }
      } catch (error) {
        console.error('Error loading employees:', error)
      }
    }
    
    loadEmployees()
  }, [owner])

  // Load labor data when filters change
  useEffect(() => {
    if (!owner?.id || !filters.startDate || !filters.endDate) return
    
    loadLaborData()
  }, [owner, filters])

  const loadLaborData = async () => {
    if (!owner?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Fetch both labor data and summary in parallel
      const [laborDataResult, summaryResult] = await Promise.all([
        api.getLaborData(
          owner.id,
          filters.startDate,
          filters.endDate,
          {
            employeeCodes: filters.employeeCodes,
            groupBy: 'none'
          }
        ),
        api.getLaborSummary(
          owner.id,
          filters.startDate,
          filters.endDate
        )
      ])
      
      setLaborData(laborDataResult || [])
      setSummary(summaryResult)
      
    } catch (error) {
      console.error('Error loading labor data:', error)
      setError('Erro ao carregar dados. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleFiltersChange = (newFilters: {
    startDate: string
    endDate: string
    periodType: 'day' | 'week' | 'month' | 'custom'
    employeeCodes?: string[]
  }) => {
    setFilters(newFilters)
  }

  // Group by preference (could be stored in user preferences)
  const [groupBy, setGroupBy] = useState<'none' | 'day' | 'employee'>('none')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Controle de Horas e Folha de Pagamento
        </h1>
        <p className="text-gray-600 mt-1">
          Visualize horas trabalhadas, custos com mão de obra e gerencie sua folha de pagamento
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Filter Bar */}
      <FilterBar 
        onFiltersChange={handleFiltersChange}
        employees={employees}
      />

      {/* Summary Cards */}
      <SummaryCards 
        summary={summary}
        loading={loading}
      />

      {/* Grouping Options */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-sm text-gray-600">Agrupar por:</span>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['none', 'day', 'employee'] as const).map(type => (
            <button
              key={type}
              onClick={() => setGroupBy(type)}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-all
                ${groupBy === type
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {type === 'none' ? 'Sem agrupamento' :
               type === 'day' ? 'Por dia' :
               'Por funcionário'}
            </button>
          ))}
        </div>
        {filters.employeeCodes && filters.employeeCodes.length > 0 && (
          <span className="text-sm text-gray-500">
            ({filters.employeeCodes.length} funcionários filtrados)
          </span>
        )}
      </div>

      {/* Data Table */}
      <LaborDataTable 
        data={laborData}
        loading={loading}
        groupBy={groupBy}
      />

      {/* Quick Insights (when we have data) */}
      {!loading && laborData.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-emerald-50 to-blue-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            💡 Insights Rápidos
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Funcionário com mais horas: </span>
              <span className="font-medium text-gray-900">
                {(() => {
                  const employeeHours = laborData.reduce((acc, record) => {
                    const code = record.employee_code
                    acc[code] = (acc[code] || 0) + Number(record.hours_worked)
                    return acc
                  }, {} as Record<string, number>)
                  
                  const topEmployee = Object.entries(employeeHours)
                    .sort(([,a], [,b]) => (b as number) - (a as number))[0]
                  
                  if (topEmployee) {
                    const employee = laborData.find(r => r.employee_code === topEmployee[0])
                    return `${employee?.employee_name} (${(topEmployee[1] as number).toFixed(1)}h)`
                  }
                  return 'N/A'
                })()}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Dia com maior custo: </span>
              <span className="font-medium text-gray-900">
                {(() => {
                  const dailyCosts = laborData.reduce((acc, record) => {
                    const date = record.work_date
                    acc[date] = (acc[date] || 0) + Number(record.labor_cost)
                    return acc
                  }, {} as Record<string, number>)
                  
                  const topDay = Object.entries(dailyCosts)
                    .sort(([,a], [,b]) => (b as number) - (a as number))[0]
                  
                  if (topDay) {
                    const formattedDate = new Date(topDay[0] + 'T12:00:00')
                      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    return `${formattedDate} (${(topDay[1] as number).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })})`
                  }
                  return 'N/A'
                })()}
              </span>
            </div>

            {summary.totalOvertimeHours > 0 && (
              <div className="md:col-span-2">
                <span className="text-orange-600">⚠️ Atenção: </span>
                <span className="font-medium text-gray-900">
                  {summary.totalOvertimeHours.toFixed(1)} horas extras registradas no período. 
                  Considere revisar a distribuição de turnos.
                </span>
              </div>
            )}

            <div className="md:col-span-2">
              <span className="text-gray-600">Fonte de dados: </span>
              <span className="font-medium text-gray-900">
                {(() => {
                  const sources = laborData.reduce((acc, record) => {
                    acc[record.source] = (acc[record.source] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                  
                  return Object.entries(sources)
                    .map(([source, count]) => 
                      `${source === 'whatsapp' ? 'WhatsApp' : 'Formulário'} (${count})`
                    )
                    .join(', ')
                })()}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
