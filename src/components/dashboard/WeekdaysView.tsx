// Weekdays View component - Shows only Monday to Friday
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { mockDailyKPIs } from '@/lib/mock-data'

interface WeekdaysViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

export default function WeekdaysView({ selectedDate, onDateSelect }: WeekdaysViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  
  const getWeekdaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const weekdays = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      const dayOfWeek = currentDate.getDay()
      
      // Only include weekdays (Monday = 1 to Friday = 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const kpi = mockDailyKPIs[dateStr]
        
        weekdays.push({
          date: currentDate,
          dayOfWeek,
          kpi
        })
      }
    }
    
    return weekdays
  }
  
  const groupWeekdaysByWeek = (weekdays: any[]) => {
    const weeks: any[][] = []
    let currentWeek: any[] = []
    
    weekdays.forEach(day => {
      if (currentWeek.length === 0 || day.dayOfWeek === 1) {
        if (currentWeek.length > 0) {
          weeks.push([...currentWeek])
        }
        currentWeek = [day]
      } else {
        currentWeek.push(day)
      }
    })
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }
    
    return weeks
  }
  
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }
  
  const getWeekStats = (week: any[]) => {
    const totalSales = week.reduce((sum, day) => sum + (day.kpi?.sales || 0), 0)
    const avgFoodPercent = week.reduce((sum, day) => sum + (day.kpi?.foodCostPercentage || 0), 0) / week.length
    const avgLabourPercent = week.reduce((sum, day) => sum + (day.kpi?.laborCostPercentage || 0), 0) / week.length
    
    return {
      totalSales,
      avgFoodPercent: Math.round(avgFoodPercent),
      avgLabourPercent: Math.round(avgLabourPercent)
    }
  }
  
  const weekdays = getWeekdaysInMonth(currentMonth)
  const groupedByWeek = groupWeekdaysByWeek(weekdays)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Dias Úteis - {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <p className="text-sm text-gray-600">
            {weekdays.length} dias úteis no mês
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Resumo do Mês</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Vendas Totais</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {weekdays.reduce((sum, day) => sum + (day.kpi?.sales || 0), 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">CMV Médio</p>
              <p className="text-2xl font-bold text-blue-600">
                {weekdays.length > 0 
                  ? Math.round(weekdays.reduce((sum, day) => sum + (day.kpi?.foodCostPercentage || 0), 0) / weekdays.length)
                  : 0}%
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">M.O. Média</p>
              <p className="text-2xl font-bold text-purple-600">
                {weekdays.length > 0 
                  ? Math.round(weekdays.reduce((sum, day) => sum + (day.kpi?.laborCostPercentage || 0), 0) / weekdays.length)
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Weeks */}
      <div className="space-y-6">
        {groupedByWeek.map((week, weekIndex) => {
          const weekStats = getWeekStats(week)
          const weekStart = week[0].date
          const weekEnd = week[week.length - 1].date
          
          return (
            <Card key={weekIndex}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Semana {weekIndex + 1} - {weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Vendas: R$ {weekStats.totalSales.toLocaleString('pt-BR')}</span>
                    <span>CMV: {weekStats.avgFoodPercent}%</span>
                    <span>M.O: {weekStats.avgLabourPercent}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(dayOfWeek => {
                    const dayData = week.find(d => d.dayOfWeek === dayOfWeek)
                    const isSelected = selectedDate.toDateString() === dayData?.date.toDateString()
                    
                    return (
                      <button
                        key={dayOfWeek}
                        onClick={() => dayData && onDateSelect(dayData.date)}
                        className={`
                          p-3 rounded-lg border-2 transition-all text-center
                          ${isSelected 
                            ? 'border-emerald-500 bg-emerald-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                          ${!dayData ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        disabled={!dayData}
                      >
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'][dayOfWeek - 1]}
                        </p>
                        
                        {dayData ? (
                          <>
                            <p className="text-xs text-gray-500">
                              {dayData.date.getDate()}/{dayData.date.getMonth() + 1}
                            </p>
                            {dayData.kpi ? (
                              <>
                                <p className="text-xs font-bold text-gray-900 mt-1">
                                  R$ {(dayData.kpi.sales / 1000).toFixed(1)}k
                                </p>
                                <div className="mt-1">
                                  <span className={`text-xs px-1 py-0.5 rounded ${
                                    dayData.kpi.foodCostPercentage > 35 ? 'bg-red-100 text-red-700' : 
                                    dayData.kpi.foodCostPercentage > 30 ? 'bg-yellow-100 text-yellow-700' : 
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {dayData.kpi.foodCostPercentage}%
                                  </span>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-gray-400 mt-1">-</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">-</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}