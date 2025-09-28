// Holiday View component
'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Star, Building, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { api } from '@/services/api'

interface HolidayViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  ownerId: string
}

// Brazilian holidays for 2024/2025
const holidays = [
  { date: '2024-01-01', name: 'Ano Novo', type: 'national' },
  { date: '2024-02-12', name: 'Carnaval', type: 'national' },
  { date: '2024-02-13', name: 'Carnaval', type: 'national' },
  { date: '2024-03-29', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2024-04-21', name: 'Tiradentes', type: 'national' },
  { date: '2024-05-01', name: 'Dia do Trabalhador', type: 'national' },
  { date: '2024-09-07', name: 'Independência', type: 'national' },
  { date: '2024-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '2024-11-02', name: 'Finados', type: 'national' },
  { date: '2024-11-15', name: 'Proclamação da República', type: 'national' },
  { date: '2024-12-25', name: 'Natal', type: 'national' },
  { date: '2025-01-01', name: 'Ano Novo', type: 'national' },
  { date: '2025-03-03', name: 'Carnaval', type: 'national' },
  { date: '2025-03-04', name: 'Carnaval', type: 'national' },
  { date: '2025-04-18', name: 'Sexta-feira Santa', type: 'national' },
  { date: '2025-04-21', name: 'Tiradentes', type: 'national' },
  { date: '2025-05-01', name: 'Dia do Trabalhador', type: 'national' },
  { date: '2025-09-07', name: 'Independência', type: 'national' },
  { date: '2025-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '2025-11-02', name: 'Finados', type: 'national' },
  { date: '2025-11-15', name: 'Proclamação da República', type: 'national' },
  { date: '2025-12-25', name: 'Natal', type: 'national' }
]

export default function HolidayView({ selectedDate, onDateSelect, ownerId }: HolidayViewProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [holidayData, setHolidayData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch holiday data when year changes
  useEffect(() => {
    if (!ownerId) return
    
    const fetchHolidayData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const yearHolidays = getHolidaysForYear(currentYear)
        const holidayData: Record<string, any> = {}
        
        // Fetch data for all holidays in the year
        const promises = yearHolidays.map(holiday => {
          return api.getDailyKPI(ownerId, holiday.date).then(kpi => {
            if (kpi) holidayData[holiday.date] = kpi
          })
        })
        
        await Promise.all(promises)
        setHolidayData(holidayData)
      } catch (err) {
        console.error('Error fetching holiday data:', err)
        setError('Erro ao carregar dados dos feriados')
      } finally {
        setLoading(false)
      }
    }
    
    fetchHolidayData()
  }, [currentYear, ownerId])
  
  const getHolidaysForYear = (year: number) => {
    return holidays.filter(h => h.date.startsWith(year.toString()))
  }
  
  const getHolidaysByMonth = (year: number) => {
    const yearHolidays = getHolidaysForYear(year)
    const byMonth: { [key: number]: any[] } = {}
    
    yearHolidays.forEach(holiday => {
      const month = parseInt(holiday.date.split('-')[1])
      if (!byMonth[month]) byMonth[month] = []
      
      const holidayDate = new Date(holiday.date)
        const kpi = holidayData[holiday.date]
      
      byMonth[month].push({
        ...holiday,
        date: holidayDate,
        kpi: kpi
      })
    })
    
    return byMonth
  }
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  
  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1)
  }
  
  const goToNextYear = () => {
    setCurrentYear(currentYear + 1)
  }
  
  const getHolidayIcon = (type: string) => {
    switch (type) {
      case 'national': return '🇧🇷'
      case 'state': return '🏛️'
      case 'municipal': return '🏢'
      default: return '📅'
    }
  }
  
  const getHolidayColor = (type: string) => {
    switch (type) {
      case 'national': return 'bg-red-50 border-red-200 text-red-800'
      case 'state': return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'municipal': return 'bg-green-50 border-green-200 text-green-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }
  
  const holidaysByMonth = getHolidaysByMonth(currentYear)
  const nationalHolidays = Object.values(holidaysByMonth).flat().filter(h => h.type === 'national')
  const municipalHolidays = Object.values(holidaysByMonth).flat().filter(h => h.type === 'municipal')
  
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Feriados {currentYear}</h2>
          <p className="text-sm text-gray-600">
            {nationalHolidays.length} feriados nacionais, {municipalHolidays.length} municipais
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousYear}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextYear}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* National Holidays */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold">Feriados Nacionais</h3>
          </div>
        </CardHeader>
        <CardContent>
          {nationalHolidays.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nationalHolidays.map((holiday, index) => {
                const isSelected = selectedDate.toDateString() === holiday.date.toDateString()
                
                return (
                  <button
                    key={index}
                    onClick={() => onDateSelect(holiday.date)}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getHolidayIcon(holiday.type)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{holiday.name}</p>
                        <p className="text-sm text-gray-600">
                          {holiday.date.toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'long' 
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {holiday.kpi ? (
                      <div>
                        <p className="text-lg font-bold text-blue-600">
                          R$ {holiday.kpi.sales.toLocaleString('pt-BR')}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            holiday.kpi.foodCostPercentage > 35 ? 'bg-red-100 text-red-700' : 
                            holiday.kpi.foodCostPercentage > 30 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            CMV: {holiday.kpi.foodCostPercentage}%
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            holiday.kpi.laborCostPercentage > 20 ? 'bg-red-100 text-red-700' : 
                            holiday.kpi.laborCostPercentage > 15 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            MO: {holiday.kpi.laborCostPercentage}%
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
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum feriado nacional em {currentYear}</p>
          )}
        </CardContent>
      </Card>
      
      {/* Municipal Holidays */}
      {municipalHolidays.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Feriados Municipais</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {municipalHolidays.map((holiday, index) => {
                const isSelected = selectedDate.toDateString() === holiday.date.toDateString()
                
                return (
                  <button
                    key={index}
                    onClick={() => onDateSelect(holiday.date)}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🏛️</span>
                      <div>
                        <p className="font-medium text-gray-900">{holiday.name}</p>
                        <p className="text-sm text-gray-600">
                          {holiday.date.toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'long' 
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {holiday.kpi ? (
                      <div>
                        <p className="text-lg font-bold text-blue-600">
                          R$ {holiday.kpi.sales.toLocaleString('pt-BR')}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            holiday.kpi.foodCostPercentage > 35 ? 'bg-red-100 text-red-700' : 
                            holiday.kpi.foodCostPercentage > 30 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            CMV: {holiday.kpi.foodCostPercentage}%
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            holiday.kpi.laborCostPercentage > 20 ? 'bg-red-100 text-red-700' : 
                            holiday.kpi.laborCostPercentage > 15 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            MO: {holiday.kpi.laborCostPercentage}%
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}