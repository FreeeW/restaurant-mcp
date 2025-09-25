// Calendar View component
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { mockDailyKPIs } from '@/lib/mock-data'

interface CalendarViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

export default function CalendarView({ selectedDate, onDateSelect }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
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
  
  const changeMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1))
  }
  
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24" />)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dateStr = date.toISOString().split('T')[0]
      const kpi = mockDailyKPIs[dateStr]
      const isSelected = selectedDate.toDateString() === date.toDateString()
      const isToday = new Date().toDateString() === date.toDateString()
      
      days.push(
        <button
          key={day}
          onClick={() => onDateSelect(date)}
          className={`
            h-24 p-2 border rounded-lg transition-all
            ${isSelected 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }
            ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
          `}
        >
          <div className="text-sm font-medium text-gray-900 mb-1">{day}</div>
          {kpi && (
            <div className="space-y-1">
              <div className="text-xs text-gray-600">
                R$ {kpi.sales.toLocaleString('pt-BR')}
              </div>
              <div className="flex gap-1">
                <span className={`text-xs px-1 py-0.5 rounded ${
                  kpi.foodPercent > 35 ? 'bg-red-100 text-red-700' : 
                  kpi.foodPercent > 30 ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-green-100 text-green-700'
                }`}>
                  {kpi.foodPercent}%
                </span>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  kpi.labourPercent > 20 ? 'bg-red-100 text-red-700' : 
                  kpi.labourPercent > 15 ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-green-100 text-green-700'
                }`}>
                  {kpi.labourPercent}%
                </span>
              </div>
            </div>
          )}
        </button>
      )
    }
    
    return days
  }
  
  return (
    <Card className="p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {renderCalendar()}
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-100 rounded"></div>
          <span className="text-gray-600">Bom</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-100 rounded"></div>
          <span className="text-gray-600">Atenção</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-100 rounded"></div>
          <span className="text-gray-600">Crítico</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-400 rounded"></div>
          <span className="text-gray-600">Hoje</span>
        </div>
      </div>
    </Card>
  )
}
