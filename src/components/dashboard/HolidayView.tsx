// Holiday View component - Shows holidays and special dates
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, PartyPopper, Star, Gift, Calendar } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { mockDailyKPIs } from '@/lib/mock-data'

interface HolidayViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

// Brazilian holidays for 2024/2025
const holidays = [
  { date: '2024-01-01', name: 'Ano Novo', type: 'national' },
  { date: '2024-02-13', name: 'Carnaval', type: 'national' },
  { date: '2024-03-29', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2024-04-21', name: 'Tiradentes', type: 'national' },
  { date: '2024-05-01', name: 'Dia do Trabalho', type: 'national' },
  { date: '2024-05-12', name: 'Dia das Mães', type: 'commemorative' },
  { date: '2024-06-12', name: 'Dia dos Namorados', type: 'commemorative' },
  { date: '2024-08-11', name: 'Dia dos Pais', type: 'commemorative' },
  { date: '2024-09-07', name: 'Independência', type: 'national' },
  { date: '2024-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '2024-11-02', name: 'Finados', type: 'national' },
  { date: '2024-11-15', name: 'Proclamação da República', type: 'national' },
  { date: '2024-11-20', name: 'Consciência Negra', type: 'municipal' },
  { date: '2024-12-24', name: 'Véspera de Natal', type: 'commemorative' },
  { date: '2024-12-25', name: 'Natal', type: 'national' },
  { date: '2024-12-31', name: 'Véspera de Ano Novo', type: 'commemorative' },
  // 2025
  { date: '2025-01-01', name: 'Ano Novo', type: 'national' },
  { date: '2025-03-04', name: 'Carnaval', type: 'national' },
  { date: '2025-04-18', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2025-04-21', name: 'Tiradentes', type: 'national' },
  { date: '2025-05-01', name: 'Dia do Trabalho', type: 'national' },
  { date: '2025-05-11', name: 'Dia das Mães', type: 'commemorative' },
  { date: '2025-06-12', name: 'Dia dos Namorados', type: 'commemorative' },
  { date: '2025-08-10', name: 'Dia dos Pais', type: 'commemorative' },
  { date: '2025-09-07', name: 'Independência', type: 'national' },
  { date: '2025-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '2025-11-02', name: 'Finados', type: 'national' },
  { date: '2025-11-15', name: 'Proclamação da República', type: 'national' },
  { date: '2025-12-25', name: 'Natal', type: 'national' },
]

export default function HolidayView({ selectedDate, onDateSelect }: HolidayViewProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  
  const getHolidaysForYear = () => {
    return holidays.filter(h => {
      const year = new Date(h.date).getFullYear()
      return year === currentYear
    }).map(h => {
      const date = new Date(h.date)
      const kpi = mockDailyKPIs[h.date]
      return {
        ...h,
        date,
        kpi,
        dayOfWeek: date.toLocaleDateString('pt-BR', { weekday: 'long' })
      }
    })
  }
  
  const yearHolidays = getHolidaysForYear()
  
  // Group by type
  const nationalHolidays = yearHolidays.filter(h => h.type === 'national')
  const commemorativeDates = yearHolidays.filter(h => h.type === 'commemorative')
  const municipalHolidays = yearHolidays.filter(h => h.type === 'municipal')
  
  const getHolidayStats = () => {
    let totalSales = 0
    let bestHoliday = { name: '', sales: 0 }
    let daysWithData = 0
    
    yearHolidays.forEach(holiday => {
      if (holiday.kpi) {
        totalSales += holiday.kpi.sales
        daysWithData++
        
        if (holiday.kpi.sales > bestHoliday.sales) {
          bestHoliday = { name: holiday.name, sales: holiday.kpi.sales }
        }
      }
    })
    
    return {
      totalSales,
      avgSales: daysWithData > 0 ? Math.round(totalSales / daysWithData) : 0,
      bestHoliday,
      daysWithData,
      totalHolidays: yearHolidays.length
    }
  }
  
  const stats = getHolidayStats()
  
  const changeYear = (direction: number) => {
    setCurrentYear(currentYear + direction)
  }
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'national': return '🇧🇷'
      case 'commemorative': return '🎉'
      case 'municipal': return '🏛️'
      default: return '📅'
    }
  }
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'national': return 'bg-green-100 text-green-800 border-green-200'
      case 'commemorative': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'municipal': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold">
                Feriados e Datas Comemorativas - {currentYear}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => changeYear(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentYear(new Date().getFullYear())}
                className="px-3 py-1 text-sm rounded-lg hover:bg-gray-100 transition-colors"
              >
                Este Ano
              </button>
              <button
                onClick={() => changeYear(1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Feriados</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalHolidays}</p>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Vendas Total</p>
              <p className="text-lg font-bold text-green-600">
                R$ {stats.totalSales.toLocaleString('pt-BR')}
              </p>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Média/Feriado</p>
              <p className="text-lg font-bold text-blue-600">
                R$ {stats.avgSales.toLocaleString('pt-BR')}
              </p>
            </div>
            
            {stats.bestHoliday.name && (
              <div className="p-3 bg-yellow-50 rounded-lg col-span-2">
                <p className="text-xs text-gray-600 mb-1">🏆 Melhor Feriado</p>
                <p className="text-sm font-bold text-yellow-700">{stats.bestHoliday.name}</p>
                <p className="text-lg font-bold text-yellow-600">
                  R$ {stats.bestHoliday.sales.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
          
          {/* Holiday Types Legend */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇧🇷</span>
              <span className="text-sm text-gray-600">Feriados Nacionais ({nationalHolidays.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🎉</span>
              <span className="text-sm text-gray-600">Datas Comemorativas ({commemorativeDates.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏛️</span>
              <span className="text-sm text-gray-600">Feriados Municipais ({municipalHolidays.length})</span>
            </div>
          </div>
          
          {/* Holidays Grid by Type */}
          <div className="space-y-6">
            {/* National Holidays */}
            {nationalHolidays.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🇧🇷</span> Feriados Nacionais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nationalHolidays.map((holiday, index) => {
                    const isSelected = selectedDate.toDateString() === holiday.date.toDateString()
                    return (
                      <button
                        key={index}
                        onClick={() => onDateSelect(holiday.date)}
                        className={`
                          p-4 rounded-lg border transition-all text-left
                          ${isSelected 
                            ? 'bg-green-100 border-green-500 shadow-md' 
                            : 'bg-white border-green-200 hover:bg-green-50 hover:shadow'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{holiday.name}</p>
                            <p className="text-xs text-gray-600">
                              {holiday.date.toLocaleDateString('pt-BR')} • {holiday.dayOfWeek}
                            </p>
                          </div>
                          <span className="text-2xl">🇧🇷</span>
                        </div>
                        {holiday.kpi ? (
                          <div>
                            <p className="text-lg font-bold text-green-600">
                              R$ {holiday.kpi.sales.toLocaleString('pt-BR')}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                holiday.kpi.foodPercent > 35 ? 'bg-red-100 text-red-700' : 
                                holiday.kpi.foodPercent > 30 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-green-100 text-green-700'
                              }`}>
                                CMV: {holiday.kpi.foodPercent}%
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                holiday.kpi.labourPercent > 20 ? 'bg-red-100 text-red-700' : 
                                holiday.kpi.labourPercent > 15 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-green-100 text-green-700'
                              }`}>
                                MO: {holiday.kpi.labourPercent}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Sem dados</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Commemorative Dates */}
            {commemorativeDates.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🎉</span> Datas Comemorativas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {commemorativeDates.map((holiday, index) => {
                    const isSelected = selectedDate.toDateString() === holiday.date.toDateString()
                    return (
                      <button
                        key={index}
                        onClick={() => onDateSelect(holiday.date)}
                        className={`
                          p-4 rounded-lg border transition-all text-left
                          ${isSelected 
                            ? 'bg-purple-100 border-purple-500 shadow-md' 
                            : 'bg-white border-purple-200 hover:bg-purple-50 hover:shadow'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{holiday.name}</p>
                            <p className="text-xs text-gray-600">
                              {holiday.date.toLocaleDateString('pt-BR')} • {holiday.dayOfWeek}
                            </p>
                          </div>
                          <span className="text-2xl">🎉</span>
                        </div>
                        {holiday.kpi ? (
                          <div>
                            <p className="text-lg font-bold text-purple-600">
                              R$ {holiday.kpi.sales.toLocaleString('pt-BR')}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                holiday.kpi.foodPercent > 35 ? 'bg-red-100 text-red-700' : 
                                holiday.kpi.foodPercent > 30 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-green-100 text-green-700'
                              }`}>
                                CMV: {holiday.kpi.foodPercent}%
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                holiday.kpi.labourPercent > 20 ? 'bg-red-100 text-red-700' : 
                                holiday.kpi.labourPercent > 15 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-green-100 text-green-700'
                              }`}>
                                MO: {holiday.kpi.labourPercent}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Sem dados</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Municipal Holidays */}
            {municipalHolidays.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🏛️</span> Feriados Municipais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {municipalHolidays.map((holiday, index) => {
                    const isSelected = selectedDate.toDateString() === holiday.date.toDateString()
                    return (
                      <button
                        key={index}
                        onClick={() => onDateSelect(holiday.date)}
                        className={`
                          p-4 rounded-lg border transition-all text-left
                          ${isSelected 
                            ? 'bg-blue-100 border-blue-500 shadow-md' 
                            : 'bg-white border-blue-200 hover:bg-blue-50 hover:shadow'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{holiday.name}</p>
                            <p className="text-xs text-gray-600">
                              {holiday.date.toLocaleDateString('pt-BR')} • {holiday.dayOfWeek}
                            </p>
                          </div>
                          <span className="text-2xl">🏛️</span>
                        </div>
                        {holiday.kpi ? (
                          <div>
                            <p className="text-lg font-bold text-blue-600">
                              R$ {holiday.kpi.sales.toLocaleString('pt-BR')}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                holiday.kpi.foodPercent > 35 ? 'bg-red-100 text-red-700' : 
                                holiday.kpi.foodPercent > 30 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-green-100 text-green-700'
                              }`}>
                                CMV: {holiday.kpi.foodPercent}%
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                holiday.kpi.labourPercent > 20 ? 'bg-red-100 text-red-700' : 
                                holiday.kpi.labourPercent > 15 ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-green-100 text-green-700'
                              }`}>
                                MO: {holiday.kpi.labourPercent}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Sem dados</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
