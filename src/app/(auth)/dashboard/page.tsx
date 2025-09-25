// Dashboard main page with multiple views
'use client'

import { useState } from 'react'
import CalendarView from '@/components/dashboard/CalendarView'
import WeekView from '@/components/dashboard/WeekView'
import MonthView from '@/components/dashboard/MonthView'
import WeekendView from '@/components/dashboard/WeekendView'
import WeekdaysView from '@/components/dashboard/WeekdaysView'
import HolidayView from '@/components/dashboard/HolidayView'
import KPICards from '@/components/dashboard/KPICards'
import DailyBreakdown from '@/components/dashboard/DailyBreakdown'
import { Calendar, CalendarDays, CalendarRange, Sun, Briefcase, PartyPopper } from 'lucide-react'

type ViewType = 'calendar' | 'week' | 'month' | 'weekend' | 'weekdays' | 'holidays'

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<ViewType>('calendar')
  
  const viewOptions = [
    { id: 'calendar' as ViewType, label: 'Calendário', icon: Calendar },
    { id: 'week' as ViewType, label: 'Semana', icon: CalendarDays },
    { id: 'month' as ViewType, label: 'Mensal', icon: CalendarRange },
    { id: 'weekend' as ViewType, label: 'Fins de Semana', icon: Sun },
    { id: 'weekdays' as ViewType, label: 'Dias Úteis', icon: Briefcase },
    { id: 'holidays' as ViewType, label: 'Feriados', icon: PartyPopper },
  ]
  
  const renderView = () => {
    switch (currentView) {
      case 'calendar':
        return <CalendarView onDateSelect={setSelectedDate} selectedDate={selectedDate} />
      case 'week':
        return <WeekView onDateSelect={setSelectedDate} selectedDate={selectedDate} />
      case 'month':
        return <MonthView onDateSelect={setSelectedDate} selectedDate={selectedDate} />
      case 'weekend':
        return <WeekendView onDateSelect={setSelectedDate} selectedDate={selectedDate} />
      case 'weekdays':
        return <WeekdaysView onDateSelect={setSelectedDate} selectedDate={selectedDate} />
      case 'holidays':
        return <HolidayView onDateSelect={setSelectedDate} selectedDate={selectedDate} />
      default:
        return <CalendarView onDateSelect={setSelectedDate} selectedDate={selectedDate} />
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral do seu restaurante</p>
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
      
      {/* KPI Cards */}
      <KPICards date={selectedDate} />
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* View - 2 columns */}
        <div className="lg:col-span-2">
          {renderView()}
        </div>
        
        {/* Daily Breakdown - 1 column */}
        <div>
          <DailyBreakdown date={selectedDate} />
        </div>
      </div>
    </div>
  )
}
