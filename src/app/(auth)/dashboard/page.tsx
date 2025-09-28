// Dashboard main page with real data from Supabase
'use client'

import { useState, useEffect } from 'react'
import CalendarView from '@/components/dashboard/CalendarView'
import WeekView from '@/components/dashboard/WeekView'
import MonthView from '@/components/dashboard/MonthView'
import WeekendView from '@/components/dashboard/WeekendView'
import WeekdaysView from '@/components/dashboard/WeekdaysView'
import HolidayView from '@/components/dashboard/HolidayView'
import KPICards from '@/components/dashboard/KPICards'
import DailyBreakdown from '@/components/dashboard/DailyBreakdown'
import { Calendar, CalendarDays, CalendarRange, Sun, Briefcase, PartyPopper, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type ViewType = 'calendar' | 'week' | 'month' | 'weekend' | 'weekdays' | 'holidays'

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<ViewType>('calendar')
  const { owner, loading } = useAuth()
  
  const viewOptions = [
    { id: 'calendar' as ViewType, label: 'Calendário', icon: Calendar },
    { id: 'week' as ViewType, label: 'Semana', icon: CalendarDays },
    { id: 'month' as ViewType, label: 'Mensal', icon: CalendarRange },
    { id: 'weekend' as ViewType, label: 'Fins de Semana', icon: Sun },
    { id: 'weekdays' as ViewType, label: 'Dias Úteis', icon: Briefcase },
    { id: 'holidays' as ViewType, label: 'Feriados', icon: PartyPopper },
  ]
  
  const renderView = () => {
    if (!owner?.id) return null
    
    switch (currentView) {
      case 'calendar':
        return <CalendarView onDateSelect={setSelectedDate} selectedDate={selectedDate} ownerId={owner.id} />
      case 'week':
        return <WeekView onDateSelect={setSelectedDate} selectedDate={selectedDate} ownerId={owner.id} />
      case 'month':
        return <MonthView onDateSelect={setSelectedDate} selectedDate={selectedDate} ownerId={owner.id} />
      case 'weekend':
        return <WeekendView onDateSelect={setSelectedDate} selectedDate={selectedDate} ownerId={owner.id} />
      case 'weekdays':
        return <WeekdaysView onDateSelect={setSelectedDate} selectedDate={selectedDate} ownerId={owner.id} />
      case 'holidays':
        return <HolidayView onDateSelect={setSelectedDate} selectedDate={selectedDate} ownerId={owner.id} />
      default:
        return <CalendarView onDateSelect={setSelectedDate} selectedDate={selectedDate} ownerId={owner.id} />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!owner) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Erro ao carregar dados. Por favor, faça login novamente.</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          {owner.business_name ? `${owner.business_name} - ` : ''}
          Visão geral do seu restaurante
        </p>
      </div>
      
      {/* View Selector */}
      <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        {viewOptions.map((view) => {
          const Icon = view.icon
          return (
            <button
              key={view.id}
              onClick={() => setCurrentView(view.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                ${currentView === view.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{view.label}</span>
            </button>
          )
        })}
      </div>
      
      {/* KPI Cards - Now with owner ID */}
      <KPICards date={selectedDate} ownerId={owner.id} />
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* View - 2 columns */}
        <div className="lg:col-span-2">
          {renderView()}
        </div>
        
        {/* Daily Breakdown - 1 column */}
        <div>
          <DailyBreakdown date={selectedDate} ownerId={owner.id} />
        </div>
      </div>
    </div>
  )
}
