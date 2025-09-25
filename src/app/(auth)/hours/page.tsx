// Hours tracking page
'use client'

import { useState } from 'react'
import { Calendar, Users, Clock, DollarSign } from 'lucide-react'
import HoursCalendar from '@/components/hours/HoursCalendar'
import DailyHoursBreakdown from '@/components/hours/DailyHoursBreakdown'
import PayrollSummary from '@/components/hours/PayrollSummary'
import { Card } from '@/components/ui/Card'

export default function HoursPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horas Trabalhadas</h1>
          <p className="text-gray-600">Controle de ponto e custos de mão de obra</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Calendário
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Lista
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Funcionários Ativos</p>
              <p className="text-2xl font-bold">8</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Horas Este Mês</p>
              <p className="text-2xl font-bold">1,234h</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Custo Total</p>
              <p className="text-2xl font-bold">R$ 18,510</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Média/Hora</p>
              <p className="text-2xl font-bold">R$ 15,00</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hours View - 2 columns */}
        <div className="lg:col-span-2">
          {viewMode === 'calendar' ? (
            <HoursCalendar 
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
            />
          ) : (
            <PayrollSummary />
          )}
        </div>
        
        {/* Daily Breakdown - 1 column */}
        <div>
          <DailyHoursBreakdown date={selectedDate} />
        </div>
      </div>
    </div>
  )
}
