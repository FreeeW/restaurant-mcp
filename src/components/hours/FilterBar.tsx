// Simple and intuitive filter bar for hours page
'use client'

import { useState, useEffect } from 'react'
import { Calendar, Filter, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface FilterBarProps {
  onFiltersChange: (filters: {
    startDate: string
    endDate: string
    periodType: 'day' | 'week' | 'month' | 'custom'
    employeeCodes?: string[]
  }) => void
  employees: { code: string; name: string }[]
}

export default function FilterBar({ onFiltersChange, employees }: FilterBarProps) {
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month' | 'custom'>('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [showEmployeeFilter, setShowEmployeeFilter] = useState(false)

  // Calculate date ranges based on period type
  const getDateRange = () => {
    const today = new Date()
    let start = new Date()
    let end = new Date()

    switch (periodType) {
      case 'day':
        start = end = today
        break
      case 'week':
        // Start from Monday of current week
        const day = today.getDay()
        const diff = today.getDate() - day + (day === 0 ? -6 : 1)
        start = new Date(today.setDate(diff))
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        break
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        break
      case 'custom':
        if (customStart && customEnd) {
          start = new Date(customStart)
          end = new Date(customEnd)
        }
        break
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }
  }

  // Update filters when any value changes
  useEffect(() => {
    const range = getDateRange()
    if (range.startDate && range.endDate) {
      onFiltersChange({
        ...range,
        periodType,
        employeeCodes: selectedEmployees.length > 0 ? selectedEmployees : undefined
      })
    }
  }, [periodType, customStart, customEnd, selectedEmployees])

  const handleEmployeeToggle = (code: string) => {
    setSelectedEmployees(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const clearEmployeeFilters = () => {
    setSelectedEmployees([])
    setShowEmployeeFilter(false)
  }

  return (
    <Card className="p-4 mb-6">
      <div className="space-y-4">
        {/* Period selector - Simple tabs */}
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month', 'custom'] as const).map(type => (
              <button
                key={type}
                onClick={() => setPeriodType(type)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all capitalize
                  ${periodType === type
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {type === 'day' ? 'Hoje' :
                 type === 'week' ? 'Semana' :
                 type === 'month' ? 'Mês' :
                 'Personalizado'}
              </button>
            ))}
          </div>

          {/* Employee filter toggle */}
          <button
            onClick={() => setShowEmployeeFilter(!showEmployeeFilter)}
            className={`
              px-4 py-2 rounded-lg border transition-all flex items-center gap-2
              ${selectedEmployees.length > 0
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <Filter className="w-4 h-4" />
            Funcionários
            {selectedEmployees.length > 0 && (
              <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                {selectedEmployees.length}
              </span>
            )}
          </button>

          {/* Quick clear all filters */}
          {(selectedEmployees.length > 0 || periodType === 'custom') && (
            <button
              onClick={() => {
                setPeriodType('week')
                setSelectedEmployees([])
                setCustomStart('')
                setCustomEnd('')
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Custom date range (only show when custom is selected) */}
        {periodType === 'custom' && (
          <div className="flex gap-4 items-center pt-2 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Data inicial"
              />
              <span className="text-gray-500">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Data final"
              />
            </div>
          </div>
        )}

        {/* Employee selector (only show when filter is clicked) */}
        {showEmployeeFilter && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Selecionar funcionários
              </span>
              <button
                onClick={clearEmployeeFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Desmarcar todos
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {employees.map(emp => (
                <label
                  key={emp.code}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.code)}
                    onChange={() => handleEmployeeToggle(emp.code)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{emp.code}</span>
                    <span className="text-gray-600 ml-1">{emp.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Current period display */}
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Período: {' '}
          <span className="font-medium text-gray-900">
            {periodType === 'day' && 'Hoje'}
            {periodType === 'week' && 'Esta semana'}
            {periodType === 'month' && 'Este mês'}
            {periodType === 'custom' && customStart && customEnd && 
              `${new Date(customStart).toLocaleDateString('pt-BR')} - ${new Date(customEnd).toLocaleDateString('pt-BR')}`
            }
          </span>
        </div>
      </div>
    </Card>
  )
}
