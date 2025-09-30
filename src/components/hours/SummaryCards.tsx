// Clear and insightful summary cards for hours page
'use client'

import { Clock, DollarSign, Users, TrendingUp, Calendar, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface SummaryCardsProps {
  summary: {
    totalHours: number
    totalCost: number
    uniqueEmployees: number
    averageHoursPerEmployee: number
    totalOvertimeHours: number
    averageDailyCost: number
  }
  loading?: boolean
}

export default function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-10 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-100 rounded"></div>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Custo Total',
      value: formatCurrency(summary.totalCost),
      icon: DollarSign,
      color: 'emerald',
      subtitle: `Média diária: ${formatCurrency(summary.averageDailyCost)}`,
      important: true
    },
    {
      title: 'Horas Totais',
      value: formatHours(summary.totalHours),
      icon: Clock,
      color: 'blue',
      subtitle: `${summary.uniqueEmployees} funcionários`,
      important: false
    },
    {
      title: 'Média por Funcionário',
      value: formatHours(summary.averageHoursPerEmployee),
      icon: Users,
      color: 'purple',
      subtitle: 'Horas médias',
      important: false
    },
    {
      title: 'Horas Extras',
      value: formatHours(summary.totalOvertimeHours),
      icon: AlertCircle,
      color: summary.totalOvertimeHours > 0 ? 'orange' : 'gray',
      subtitle: summary.totalOvertimeHours > 0 ? 'Acima de 8h/dia' : 'Sem horas extras',
      important: summary.totalOvertimeHours > 20
    }
  ]

  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    gray: 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card
            key={index}
            className={`
              p-6 transition-all hover:shadow-md
              ${card.important ? 'ring-2 ring-emerald-500 ring-opacity-50' : ''}
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg ${colorClasses[card.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              {card.important && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                  Importante
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {card.title}
            </h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {card.value}
            </p>
            <p className="text-xs text-gray-500">
              {card.subtitle}
            </p>
          </Card>
        )
      })}
    </div>
  )
}
