// Calendar View component
'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { api } from '@/services/api'
import type { EnhancedDailyKPI } from '@/services/api'

interface CalendarViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  ownerId: string
}

export default function CalendarView({ selectedDate, onDateSelect, ownerId }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monthData, setMonthData] = useState<Record<string, EnhancedDailyKPI>>({})
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }
  
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }
  
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }
  
  // Fetch month data when month changes
  useEffect(() => {
    if (!ownerId) return
    
    const fetchMonthData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const daysInMonth = getDaysInMonth(currentMonth)
        const monthData: Record<string, EnhancedDailyKPI> = {}
        
        // Fetch data for each day in the month with rolling CMV
        const promises = []
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day)
          const dateStr = date.toISOString().split('T')[0]
          promises.push(
            api.getDailyKPIEnhanced(ownerId, dateStr, 30).then(kpi => {
              if (kpi) monthData[dateStr] = kpi
            })
          )
        }
        
        await Promise.all(promises)
        setMonthData(monthData)
      } catch (err) {
        console.error('Error fetching month data:', err)
        setError('Erro ao carregar dados do mês')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMonthData()
  }, [currentMonth, ownerId])
  
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20"></div>)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dateStr = date.toISOString().split('T')[0]
      const kpi = monthData[dateStr]
      const isSelected = selectedDate.toDateString() === date.toDateString()
      const isToday = new Date().toDateString() === date.toDateString()
      
      days.push(
        <button
          key={day}
          onClick={() => onDateSelect(date)}
          className={`
            h-20 p-1.5 border rounded-lg transition-all relative overflow-hidden
            ${isSelected 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }
            ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Day number */}
            <div className="text-sm font-semibold text-gray-900">{day}</div>
            
            {kpi ? (
              <div className="flex-1 flex flex-col justify-between mt-1">
                {/* Sales amount */}
                <div className="text-xs text-gray-700 font-medium truncate">
                  {(kpi.sales / 1000).toFixed(1)}k
                </div>
                
                {/* KPI badges - more compact */}
                <div className="flex gap-0.5">
                  {/* CMV badge */}
                  <div className={`flex-1 rounded text-center py-0.5 ${
                    kpi.rolling_cmv_percentage > 35 ? 'bg-red-100' : 
                    kpi.rolling_cmv_percentage > 30 ? 'bg-yellow-100' : 
                    'bg-green-100'
                  }`}>
                    <span className={`text-xs font-medium ${
                      kpi.rolling_cmv_percentage > 35 ? 'text-red-700' : 
                      kpi.rolling_cmv_percentage > 30 ? 'text-yellow-700' : 
                      'text-green-700'
                    }`}>
                      {kpi.is_purchase_day && <span className="text-xs">📦</span>}
                      {kpi.rolling_cmv_percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Labor badge */}
                  <div className={`flex-1 rounded text-center py-0.5 ${
                    kpi.labor_cost_percentage > 30 ? 'bg-red-100' : 
                    kpi.labor_cost_percentage > 25 ? 'bg-yellow-100' : 
                    'bg-green-100'
                  }`}>
                    <span className={`text-xs font-medium ${
                      kpi.labor_cost_percentage > 30 ? 'text-red-700' : 
                      kpi.labor_cost_percentage > 25 ? 'text-yellow-700' : 
                      'text-green-700'
                    }`}>
                      {kpi.labor_cost_percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs text-gray-400">-</span>
              </div>
            )}
          </div>
        </button>
      )
    }
    
    return days
  }
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm underline"
          >
            Tentar novamente
          </button>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {renderCalendar()}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 rounded"></div>
          <span>CMV ≤ 30%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-100 rounded"></div>
          <span>CMV 30-35%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 rounded"></div>
          <span>CMV &gt; 35%</span>
        </div>
      </div>
    </Card>
  )
}