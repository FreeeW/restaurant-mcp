// Week View component
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { mockDailyKPIs } from '@/lib/mock-data'

interface WeekViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

export default function WeekView({ selectedDate, onDateSelect }: WeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const date = new Date()
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    return new Date(date.setDate(diff))
  })
  
  const getWeekDays = (startDate: Date) => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    return days
  }
  
  const weekDays = getWeekDays(currentWeek)
  
  const getWeekStats = () => {
    let totalSales = 0
    let totalFoodCost = 0
    let totalLabourCost = 0
    let daysWithData = 0
    
    weekDays.forEach(date => {
      const dateStr = date.toISOString().split('T')[0]
      const kpi = mockDailyKPIs[dateStr]
      if (kpi) {
        totalSales += kpi.sales
        totalFoodCost += kpi.foodCost
        totalLabourCost += kpi.laborCost
        daysWithData++
      }
    })
    
    return {
      totalSales,
      totalFoodCost,
      totalLabourCost,
      avgFoodPercent: daysWithData > 0 ? Math.round((totalFoodCost / totalSales) * 100) : 0,
      avgLabourPercent: daysWithData > 0 ? Math.round((totalLabourCost / totalSales) * 100) : 0,
      daysWithData
    }
  }
  
  const weekStats = getWeekStats()
  
  const changeWeek = (direction: number) => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + (direction * 7))
    setCurrentWeek(newWeek)
  }
  
  const formatWeekRange = () => {
    const start = weekDays[0]
    const end = weekDays[6]
    const startMonth = start.toLocaleDateString('pt-BR', { month: 'short' })
    const endMonth = end.toLocaleDateString('pt-BR', { month: 'short' })
    
    if (startMonth === endMonth) {
      return `${start.getDate()} - ${end.getDate()} de ${start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    } else {
      return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${end.getFullYear()}`
    }
  }
  
  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  
  return (
    <div className="space-y-4">
      {/* Week Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{formatWeekRange()}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => changeWeek(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 transition-colors"
            >
              Esta Semana
            </button>
            <button
              onClick={() => changeWeek(1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Week Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Vendas Total</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {weekStats.totalSales.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">CMV Médio</p>
            <p className="text-2xl font-bold text-blue-600">{weekStats.avgFoodPercent}%</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">M.O. Média</p>
            <p className="text-2xl font-bold text-purple-600">{weekStats.avgLabourPercent}%</p>
          </div>
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0]
            const kpi = mockDailyKPIs[dateStr]
            const isSelected = selectedDate.toDateString() === date.toDateString()
            const isToday = new Date().toDateString() === date.toDateString()
            
            return (
              <button
                key={index}
                onClick={() => onDateSelect(date)}
                className={`
                  p-3 border rounded-lg transition-all text-center
                  ${isSelected 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                  ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
                `}
              >
                <p className="text-xs font-medium text-gray-600 mb-1">{dayNames[index]}</p>
                <p className="text-sm font-bold text-gray-900 mb-2">{date.getDate()}</p>
                {kpi ? (
                  <>
                    <p className="text-xs font-medium text-gray-900">
                      R$ {(kpi.sales / 1000).toFixed(1)}k
                    </p>
                    <div className="flex justify-center gap-1 mt-1">
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        kpi.foodCostPercentage > 35 ? 'bg-red-100 text-red-700' : 
                        kpi.foodCostPercentage > 30 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {kpi.foodCostPercentage}%
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Sem dados</p>
                )}
              </button>
            )
          })}
        </div>
      </Card>
      
      {/* Week Comparison */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparativo Semanal</h3>
        <div className="space-y-3">
          {weekDays.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0]
            const kpi = mockDailyKPIs[dateStr]
            
            // Get previous week same day for comparison
            const prevWeekDate = new Date(date)
            prevWeekDate.setDate(date.getDate() - 7)
            const prevDateStr = prevWeekDate.toISOString().split('T')[0]
            const prevKpi = mockDailyKPIs[prevDateStr]
            
            const salesTrend = kpi && prevKpi ? ((kpi.sales - prevKpi.sales) / prevKpi.sales) * 100 : 0
            
            return (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dayNames[index]}</p>
                    <p className="text-xs text-gray-500">{date.toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                {kpi ? (
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-medium text-gray-900">
                      R$ {kpi.sales.toLocaleString('pt-BR')}
                    </p>
                    {prevKpi && (
                      <div className={`flex items-center gap-1 text-sm ${
                        salesTrend > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {salesTrend > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(Math.round(salesTrend))}%</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">-</p>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
