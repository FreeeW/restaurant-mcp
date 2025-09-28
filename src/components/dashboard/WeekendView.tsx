// Weekend View component - Shows only weekends (Saturdays and Sundays)
'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon, TrendingUp, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { api } from '@/services/api'

interface WeekendViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  ownerId: string
}

export default function WeekendView({ selectedDate, onDateSelect, ownerId }: WeekendViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [weekendData, setWeekendData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  
  // Fetch weekend data when month changes
  useEffect(() => {
    if (!ownerId) return
    
    const fetchWeekendData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const weekendData: Record<string, any> = {}
        
        // Fetch data for weekends only
        const promises = []
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day)
          const dayOfWeek = date.getDay()
          
          // Only fetch data for weekends (Saturday = 6, Sunday = 0)
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            const dateStr = date.toISOString().split('T')[0]
            promises.push(
              api.getDailyKPI(ownerId, dateStr).then(kpi => {
                if (kpi) weekendData[dateStr] = kpi
              })
            )
          }
        }
        
        await Promise.all(promises)
        setWeekendData(weekendData)
      } catch (err) {
        console.error('Error fetching weekend data:', err)
        setError('Erro ao carregar dados dos fins de semana')
      } finally {
        setLoading(false)
      }
    }
    
    fetchWeekendData()
  }, [currentMonth, ownerId])
  
  const getWeekendsInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const weekends = []
    
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()
      
      // Saturday (6) or Sunday (0)
      if (dayOfWeek === 6 || dayOfWeek === 0) {
        const dateStr = date.toISOString().split('T')[0]
        const kpi = weekendData[dateStr]
        weekends.push({
          date,
          dateStr,
          kpi,
          isSaturday: dayOfWeek === 6
        })
      }
    }
    
    return weekends
  }
  
  const weekends = getWeekendsInMonth()
  
  // Group weekends by weekend (Saturday-Sunday pairs)
  const groupedWeekends = []
  for (let i = 0; i < weekends.length; i++) {
    if (weekends[i].isSaturday) {
      const weekend = {
        saturday: weekends[i],
        sunday: weekends[i + 1] && !weekends[i + 1].isSaturday ? weekends[i + 1] : null
      }
      groupedWeekends.push(weekend)
      if (weekend.sunday) i++ // Skip the Sunday we just paired
    } else {
      // Standalone Sunday at the beginning of the month
      groupedWeekends.push({
        saturday: null,
        sunday: weekends[i]
      })
    }
  }
  
  const getWeekendStats = () => {
    let totalSales = 0
    let totalSaturdays = 0
    let totalSundays = 0
    let saturdaySales = 0
    let sundaySales = 0
    
    weekends.forEach(({ kpi, isSaturday }) => {
      if (kpi) {
        totalSales += kpi.sales
        if (isSaturday) {
          saturdaySales += kpi.sales
          totalSaturdays++
        } else {
          sundaySales += kpi.sales
          totalSundays++
        }
      }
    })
    
    return {
      totalSales,
      avgSaturdaySales: totalSaturdays > 0 ? Math.round(saturdaySales / totalSaturdays) : 0,
      avgSundaySales: totalSundays > 0 ? Math.round(sundaySales / totalSundays) : 0,
      saturdaySales,
      sundaySales,
      totalWeekends: groupedWeekends.length
    }
  }
  
  const stats = getWeekendStats()
  
  const changeMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1))
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
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">
                Fins de Semana - {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
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
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Fins de Semana</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.totalWeekends}</p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Vendas Total</p>
              <p className="text-xl font-bold text-green-600">
                R$ {stats.totalSales.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Média Sábados</p>
              <p className="text-xl font-bold text-blue-600">
                R$ {stats.avgSaturdaySales.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Média Domingos</p>
              <p className="text-xl font-bold text-purple-600">
                R$ {stats.avgSundaySales.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          
          {/* Weekend Comparison */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparativo Sábado vs Domingo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sun className="w-4 h-4 text-orange-500" />
                  <p className="text-sm font-medium text-gray-700">Sábados</p>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {stats.saturdaySales.toLocaleString('pt-BR')}
                </p>
                <div className="mt-2 h-2 bg-orange-200 rounded-full">
                  <div 
                    className="h-2 bg-orange-500 rounded-full transition-all"
                    style={{ width: `${stats.totalSales > 0 ? (stats.saturdaySales / stats.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <p className="text-sm font-medium text-gray-700">Domingos</p>
                </div>
                <p className="text-2xl font-bold text-indigo-600">
                  R$ {stats.sundaySales.toLocaleString('pt-BR')}
                </p>
                <div className="mt-2 h-2 bg-indigo-200 rounded-full">
                  <div 
                    className="h-2 bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${stats.totalSales > 0 ? (stats.sundaySales / stats.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Weekends List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Detalhamento por Fim de Semana</h3>
            <div className="space-y-3">
              {groupedWeekends.map((weekend, index) => {
                const weekendTotal = 
                  (weekend.saturday?.kpi?.sales || 0) + 
                  (weekend.sunday?.kpi?.sales || 0)
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">
                          Fim de Semana {index + 1}
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          Total: R$ {weekendTotal.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 divide-x divide-gray-200">
                      {/* Saturday */}
                      {weekend.saturday ? (
                        <button
                          onClick={() => onDateSelect(weekend.saturday.date)}
                          className={`p-4 hover:bg-orange-50 transition-colors ${
                            selectedDate.toDateString() === weekend.saturday.date.toDateString() 
                              ? 'bg-orange-100' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Sun className="w-4 h-4 text-orange-500" />
                            <p className="text-sm font-medium text-gray-700">Sábado</p>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {weekend.saturday.date.toLocaleDateString('pt-BR')}
                          </p>
                          {weekend.saturday.kpi ? (
                            <>
                              <p className="text-lg font-bold text-gray-900">
                                R$ {weekend.saturday.kpi.sales.toLocaleString('pt-BR')}
                              </p>
                              <div className="flex justify-center gap-1 mt-2">
                                <span className={`text-xs px-1 py-0.5 rounded ${
                                  weekend.saturday.kpi.foodCostPercentage > 35 ? 'bg-red-100 text-red-700' : 
                                  weekend.saturday.kpi.foodCostPercentage > 30 ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-green-100 text-green-700'
                                }`}>
                                  CMV: {weekend.saturday.kpi.foodCostPercentage}%
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-400">Sem dados</p>
                          )}
                        </button>
                      ) : (
                        <div className="p-4 bg-gray-50" />
                      )}
                      
                      {/* Sunday */}
                      {weekend.sunday ? (
                        <button
                          onClick={() => weekend.sunday && onDateSelect(weekend.sunday.date)}
                          className={`p-4 hover:bg-indigo-50 transition-colors ${
                            weekend.sunday && selectedDate.toDateString() === weekend.sunday.date.toDateString() 
                              ? 'bg-indigo-100' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Moon className="w-4 h-4 text-indigo-500" />
                            <p className="text-sm font-medium text-gray-700">Domingo</p>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {weekend.sunday.date.toLocaleDateString('pt-BR')}
                          </p>
                          {weekend.sunday.kpi ? (
                            <>
                              <p className="text-lg font-bold text-gray-900">
                                R$ {weekend.sunday.kpi.sales.toLocaleString('pt-BR')}
                              </p>
                              <div className="flex justify-center gap-1 mt-2">
                                <span className={`text-xs px-1 py-0.5 rounded ${
                                  weekend.sunday.kpi.foodCostPercentage > 35 ? 'bg-red-100 text-red-700' : 
                                  weekend.sunday.kpi.foodCostPercentage > 30 ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-green-100 text-green-700'
                                }`}>
                                  CMV: {weekend.sunday.kpi.foodCostPercentage}%
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-400">Sem dados</p>
                          )}
                        </button>
                      ) : (
                        <div className="p-4 bg-gray-50" />
                      )}
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
