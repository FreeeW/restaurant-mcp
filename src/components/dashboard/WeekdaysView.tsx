// Weekdays View component - Shows only weekdays (Monday to Friday)
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Briefcase, TrendingUp, Calendar } from 'lucide-react'
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
  
  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
  
  const getWeekdaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const weekdays = []
    
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()
      
      // Monday (1) to Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = date.toISOString().split('T')[0]
        const kpi = mockDailyKPIs[dateStr]
        weekdays.push({
          date,
          dateStr,
          kpi,
          dayOfWeek,
          dayName: dayNames[dayOfWeek - 1]
        })
      }
    }
    
    return weekdays
  }
  
  const weekdays = getWeekdaysInMonth()
  
  // Group by weeks
  const groupedByWeek = []
  let currentWeek = []
  let lastWeek = null
  
  weekdays.forEach(day => {
    const weekOfMonth = Math.ceil(day.date.getDate() / 7)
    
    if (lastWeek !== weekOfMonth) {
      if (currentWeek.length > 0) {
        groupedByWeek.push(currentWeek)
      }
      currentWeek = []
      lastWeek = weekOfMonth
    }
    currentWeek.push(day)
  })
  
  if (currentWeek.length > 0) {
    groupedByWeek.push(currentWeek)
  }
  
  const getWeekdayStats = () => {
    let totalSales = 0
    const dayStats = {
      monday: { total: 0, count: 0 },
      tuesday: { total: 0, count: 0 },
      wednesday: { total: 0, count: 0 },
      thursday: { total: 0, count: 0 },
      friday: { total: 0, count: 0 }
    }
    
    weekdays.forEach(({ kpi, dayOfWeek }) => {
      if (kpi) {
        totalSales += kpi.sales
        const dayKey = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'][dayOfWeek]
        if (dayKey) {
          dayStats[dayKey as keyof typeof dayStats].total += kpi.sales
          dayStats[dayKey as keyof typeof dayStats].count++
        }
      }
    })
    
    // Find best performing weekday
    let bestDay = { name: '', avg: 0 }
    Object.entries(dayStats).forEach(([key, stats]) => {
      const avg = stats.count > 0 ? stats.total / stats.count : 0
      if (avg > bestDay.avg) {
        bestDay = { 
          name: key.charAt(0).toUpperCase() + key.slice(1), 
          avg 
        }
      }
    })
    
    return {
      totalSales,
      totalDays: weekdays.length,
      avgDailySales: weekdays.length > 0 ? Math.round(totalSales / weekdays.filter(d => d.kpi).length) : 0,
      dayStats,
      bestDay
    }
  }
  
  const stats = getWeekdayStats()
  
  const changeMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1))
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">
                Dias Úteis - {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
            </div>
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
                Este Mês
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Dias Úteis</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalDays}</p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Vendas Total</p>
              <p className="text-xl font-bold text-green-600">
                R$ {stats.totalSales.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Média Diária</p>
              <p className="text-xl font-bold text-purple-600">
                R$ {stats.avgDailySales.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Melhor Dia</p>
              <p className="text-lg font-bold text-yellow-600">
                {stats.bestDay.name}
              </p>
              <p className="text-xs text-gray-500">
                R$ {Math.round(stats.bestDay.avg).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          
          {/* Performance by Day of Week */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Desempenho por Dia da Semana</h3>
            <div className="grid grid-cols-5 gap-2">
              {dayNames.map((dayName, index) => {
                const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][index]
                const dayData = stats.dayStats[dayKey as keyof typeof stats.dayStats]
                const avgSales = dayData.count > 0 ? dayData.total / dayData.count : 0
                const maxAvg = Math.max(...Object.values(stats.dayStats).map(d => 
                  d.count > 0 ? d.total / d.count : 0
                ))
                const heightPercent = maxAvg > 0 ? (avgSales / maxAvg) * 100 : 0
                
                return (
                  <div key={index} className="text-center">
                    <p className="text-xs font-medium text-gray-600 mb-2">{dayName}</p>
                    <div className="h-24 flex flex-col justify-end mb-2">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${heightPercent}%`, minHeight: '2px' }}
                      />
                    </div>
                    <p className="text-xs font-bold text-gray-900">
                      R$ {Math.round(avgSales).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {dayData.count} dias
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Weeks Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento por Semana</h3>
            <div className="space-y-3">
              {groupedByWeek.map((week, weekIndex) => {
                const weekTotal = week.reduce((sum, day) => sum + (day.kpi?.sales || 0), 0)
                const weekAvg = week.filter(d => d.kpi).length > 0 
                  ? Math.round(weekTotal / week.filter(d => d.kpi).length)
                  : 0
                
                return (
                  <div key={weekIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">
                        Semana {weekIndex + 1}
                      </p>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          Total: R$ {weekTotal.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-gray-500">
                          Média: R$ {weekAvg.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(dayOfWeek => {
                        const dayData = week.find(d => d.dayOfWeek === dayOfWeek)
                        
                        return (
                          <button
                            key={dayOfWeek}
                            onClick={() => dayData && onDateSelect(dayData.date)}
                            disabled={!dayData}
                            className={`
                              p-2 rounded-lg border transition-all
                              ${!dayData 
                                ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
                                : selectedDate.toDateString() === dayData.date.toDateString()
                                  ? 'bg-blue-100 border-blue-500'
                                  : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                              }
                            `}
                          >
                            <p className="text-xs font-medium text-gray-600">
                              {dayNames[dayOfWeek - 1]}
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
                                        dayData.kpi.foodPercent > 35 ? 'bg-red-100 text-red-700' : 
                                        dayData.kpi.foodPercent > 30 ? 'bg-yellow-100 text-yellow-700' : 
                                        'bg-green-100 text-green-700'
                                      }`}>
                                        {dayData.kpi.foodPercent}%
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
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
