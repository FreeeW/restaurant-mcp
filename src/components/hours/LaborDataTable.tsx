// Clean and informative labor data table
'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, DollarSign, Calendar, User, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface LaborRecord {
  work_date: string
  employee_code: string
  employee_name: string
  hours_worked: number
  hourly_rate: number
  labor_cost: number
  status: string
  source: 'form' | 'whatsapp'
  check_in?: string
  check_out?: string
  overtime_hours?: number
  regular_hours?: number
}

interface LaborDataTableProps {
  data: LaborRecord[]
  loading?: boolean
  groupBy?: 'none' | 'day' | 'employee'
}

export default function LaborDataTable({ data, loading, groupBy = 'none' }: LaborDataTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'date' | 'employee' | 'hours' | 'cost'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const formatDate = (date: string) => {
    return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      weekday: 'short'
    })
  }

  const formatTime = (datetime: string | undefined) => {
    if (!datetime) return '-'
    return new Date(datetime).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  // Group data if needed
  const groupedData = () => {
    if (groupBy === 'none') return { '': data }

    const groups: Record<string, LaborRecord[]> = {}
    
    data.forEach(record => {
      const key = groupBy === 'day' 
        ? record.work_date 
        : record.employee_code
      
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(record)
    })

    return groups
  }

  // Sort data
  const sortedData = (records: LaborRecord[]) => {
    return [...records].sort((a, b) => {
      let compareValue = 0
      
      switch (sortBy) {
        case 'date':
          compareValue = new Date(a.work_date).getTime() - new Date(b.work_date).getTime()
          break
        case 'employee':
          compareValue = a.employee_name.localeCompare(b.employee_name)
          break
        case 'hours':
          compareValue = a.hours_worked - b.hours_worked
          break
        case 'cost':
          compareValue = a.labor_cost - b.labor_cost
          break
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue
    })
  }

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Funcionário', 'Código', 'Horas', 'Valor/Hora', 'Total', 'Status', 'Origem']
    const rows = data.map(r => [
      r.work_date,
      r.employee_name,
      r.employee_code,
      r.hours_worked.toFixed(2),
      r.hourly_rate.toFixed(2),
      r.labor_cost.toFixed(2),
      r.status,
      r.source
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `horas_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Nenhum registro encontrado para o período selecionado</p>
      </Card>
    )
  }

  const groups = groupedData()

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Detalhes de Horas Trabalhadas
        </h2>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Data
                  {sortBy === 'date' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('employee')}
              >
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Funcionário
                  {sortBy === 'employee' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('hours')}
              >
                <div className="flex items-center justify-end gap-1">
                  <Clock className="w-4 h-4" />
                  Horas
                  {sortBy === 'hours' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor/Hora
              </th>
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cost')}
              >
                <div className="flex items-center justify-end gap-1">
                  <DollarSign className="w-4 h-4" />
                  Total
                  {sortBy === 'cost' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entrada/Saída
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Origem
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(groups).map(([groupKey, records]) => (
              <React.Fragment key={groupKey}>
                {groupBy !== 'none' && (
                  <tr 
                    className="bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <td colSpan={7} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expandedGroups.has(groupKey) ? 
                            <ChevronDown className="w-4 h-4" /> : 
                            <ChevronUp className="w-4 h-4" />
                          }
                          <span className="font-medium">
                            {groupBy === 'day' ? formatDate(groupKey) : 
                             `${records[0]?.employee_name} (${groupKey})`}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({records.length} registros)
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>
                            Total: {records.reduce((sum, r) => sum + Number(r.hours_worked), 0).toFixed(1)}h
                          </span>
                          <span className="font-medium">
                            {formatCurrency(records.reduce((sum, r) => sum + Number(r.labor_cost), 0))}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {(groupBy === 'none' || expandedGroups.has(groupKey)) && 
                  sortedData(records).map((record, index) => (
                    <tr key={`${record.employee_code}-${record.work_date}-${index}`} 
                        className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.work_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.employee_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.employee_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div>
                          <div className="text-sm text-gray-900">
                            {Number(record.hours_worked).toFixed(1)}h
                          </div>
                          {record.overtime_hours && record.overtime_hours > 0 && (
                            <div className="text-xs text-orange-600">
                              +{record.overtime_hours.toFixed(1)}h extra
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(Number(record.hourly_rate))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(Number(record.labor_cost))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                        {record.check_in || record.check_out ? (
                          <div className="text-gray-600">
                            <div>{formatTime(record.check_in)}</div>
                            <div>{formatTime(record.check_out)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`
                          inline-flex px-2 py-1 text-xs rounded-full
                          ${record.source === 'whatsapp' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'}
                        `}>
                          {record.source === 'whatsapp' ? 'WhatsApp' : 'Formulário'}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </React.Fragment>
            ))}
          </tbody>
          {/* Table footer with totals */}
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td colSpan={2} className="px-6 py-4 text-sm font-medium text-gray-900">
                Total Geral
              </td>
              <td className="px-6 py-4 text-right font-bold text-gray-900">
                {data.reduce((sum, r) => sum + Number(r.hours_worked), 0).toFixed(1)}h
              </td>
              <td></td>
              <td className="px-6 py-4 text-right font-bold text-gray-900">
                {formatCurrency(data.reduce((sum, r) => sum + Number(r.labor_cost), 0))}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
