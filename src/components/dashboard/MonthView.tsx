// Month View component
'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, Package, Users, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { api } from '@/services/api'
import type { EnhancedDailyKPI } from '@/services/api'

interface MonthViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  ownerId: string
}

export default function MonthView({ selectedDate, onDateSelect, ownerId }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [monthData, setMonthData] = useState<Record<string, EnhancedDailyKPI>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  
  // Fetch month data when month changes
  useEffect(() => {
    if (!ownerId) return
    
    const fetchMonthData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
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
  
  const getMonthStats = () => {
    let totalSales = 0
    let totalFoodCost = 0
    let totalLabourCost = 0
    let bestDay = { date: '', sales: 0 }
    let worstDay = { date: '', sales: Infinity }
    let daysWithData = 0
    
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const kpi = monthData[dateStr]
      
      if (kpi) {
        totalSales += kpi.sales
        totalFoodCost += kpi.theoretical_food_cost || kpi.food_cost
        totalLabourCost += kpi.labor_cost
        daysWithData++
        
        if (kpi.sales > bestDay.sales) {
          bestDay = { date: dateStr, sales: kpi.sales }
        }
        if (kpi.sales < worstDay.sales) {
          worstDay = { date: dateStr, sales: kpi.sales }
        }
      }
    }
    
    return {
      totalSales,
      totalFoodCost,
      totalLabourCost,
      avgFoodPercent: daysWithData > 0 ? Math.round((totalFoodCost / totalSales) * 100) : 0,
      avgLabourPercent: daysWithData > 0 ? Math.round((totalLabourCost / totalSales) * 100) : 0,
      avgDailySales: daysWithData > 0 ? Math.round(totalSales / daysWithData) : 0,
      daysWithData,
      bestDay,
      worstDay: worstDay.sales === Infinity ? { date: '', sales: 0 } : worstDay
    }
  }
  
  const monthStats = getMonthStats()
  
  const changeMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1))
  }
  
  // Get week data for the month
  const getWeeksInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const weeks = []
    let currentWeek = []
    let weekSales = 0
    let weekStart = null
    
    // Start from the first day of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const kpi = monthData[dateStr]
      
      if (!weekStart) weekStart = date
      
      currentWeek.push(date)
      if (kpi) weekSales += kpi.sales
      
      // If it's Sunday or the last day of month, close the week
      if (date.getDay() === 0 || day === lastDay.getDate()) {
        weeks.push({
          start: weekStart,
          end: date,
          days: [...currentWeek],
          sales: weekSales
        })
        currentWeek = []
        weekSales = 0
        weekStart = null
      }
    }
    
    return weeks
  }
  
  const weeks = getWeeksInMonth()
  
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
    <div className="space-y-4">
      {/* Month Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
              >
                Este Mês
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Month Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-600">Vendas Total</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                R$ {monthStats.totalSales.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {monthStats.daysWithData} dias
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600">Média Diária</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                R$ {monthStats.avgDailySales.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-yellow-600" />
                <p className="text-xs text-gray-600">CMV Médio</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{monthStats.avgFoodPercent}%</p>
              <p className="text-xs text-gray-500 mt-1">
                R$ {monthStats.totalFoodCost.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-600" />
                <p className="text-xs text-gray-600">M.O. Média</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{monthStats.avgLabourPercent}%</p>
              <p className="text-xs text-gray-500 mt-1">
                R$ {monthStats.totalLabourCost.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          
          {/* Best and Worst Days */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {monthStats.bestDay.date && (
              <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 font-medium mb-1">📈 Melhor Dia</p>
                <p className="text-sm text-gray-900">
                  {new Date(monthStats.bestDay.date).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-lg font-bold text-green-600">
                  R$ {monthStats.bestDay.sales.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            
            {monthStats.worstDay.date && (
              <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
                <p className="text-xs text-red-700 font-medium mb-1">📉 Pior Dia</p>
                <p className="text-sm text-gray-900">
                  {new Date(monthStats.worstDay.date).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-lg font-bold text-red-600">
                  R$ {monthStats.worstDay.sales.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
          
          {/* Weekly Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Desempenho por Semana</h3>
            <div className="space-y-2">
              {weeks.map((week, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Semana {index + 1}
                      </p>
                      <p className="text-xs text-gray-500">
                        {week.start.getDate()}/{week.start.getMonth() + 1} - {week.end.getDate()}/{week.end.getMonth() + 1}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        R$ {week.sales.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {week.days.length} dias
                      </p>
                    </div>
                  </div>
                  
                  {/* Mini bar chart */}
                  <div className="mt-2 flex gap-1">
                    {week.days.map((date, dayIndex) => {
                      const dateStr = date.toISOString().split('T')[0]
                      const kpi = monthData[dateStr]
                      const maxSales = Math.max(...week.days.map(d => {
                        const str = d.toISOString().split('T')[0]
                        return monthData[str]?.sales || 0
                      }))
                      const height = kpi ? (kpi.sales / maxSales) * 100 : 0
                      
                      return (
                        <button
                          key={dayIndex}
                          onClick={() => onDateSelect(date)}
                          className="flex-1 flex flex-col justify-end h-12 hover:opacity-80 transition-opacity"
                          title={`${date.toLocaleDateString('pt-BR')}: R$ ${kpi?.sales.toLocaleString('pt-BR') || '0'}`}
                        >
                          <div 
                            className={`w-full rounded-t ${
                              kpi ? 'bg-emerald-500' : 'bg-gray-300'
                            }`}
                            style={{ height: `${height}%`, minHeight: '2px' }}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
