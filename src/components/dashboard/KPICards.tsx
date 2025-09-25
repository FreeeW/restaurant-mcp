// KPI Cards component
'use client'

import { TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { mockDailyKPIs } from '@/lib/mock-data'

interface KPICardsProps {
  date: Date
}

export default function KPICards({ date }: KPICardsProps) {
  const dateStr = date.toISOString().split('T')[0]
  const todayKPI = mockDailyKPIs[dateStr]
  
  // Get yesterday's KPI for comparison
  const yesterday = new Date(date)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const yesterdayKPI = mockDailyKPIs[yesterdayStr]
  
  const calculateTrend = (current?: number, previous?: number) => {
    if (!current || !previous) return { value: 0, isUp: false }
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(Math.round(change)), isUp: change > 0 }
  }
  
  const salesTrend = calculateTrend(todayKPI?.sales, yesterdayKPI?.sales)
  const foodTrend = calculateTrend(todayKPI?.foodPercent, yesterdayKPI?.foodPercent)
  const labourTrend = calculateTrend(todayKPI?.labourPercent, yesterdayKPI?.labourPercent)
  
  const cards = [
    {
      title: 'Vendas do Dia',
      value: todayKPI ? `R$ ${todayKPI.sales.toLocaleString('pt-BR')}` : 'R$ 0',
      trend: salesTrend,
      icon: DollarSign,
      color: 'green',
      trendIsGood: salesTrend.isUp
    },
    {
      title: 'CMV (Food Cost)',
      value: todayKPI ? `${todayKPI.foodPercent}%` : '0%',
      subtitle: todayKPI ? `R$ ${todayKPI.foodCost.toLocaleString('pt-BR')}` : 'R$ 0',
      trend: foodTrend,
      icon: Package,
      color: todayKPI?.foodPercent && todayKPI.foodPercent > 35 ? 'red' : 
             todayKPI?.foodPercent && todayKPI.foodPercent > 30 ? 'yellow' : 'green',
      trendIsGood: !foodTrend.isUp
    },
    {
      title: 'Mão de Obra',
      value: todayKPI ? `${todayKPI.labourPercent}%` : '0%',
      subtitle: todayKPI ? `R$ ${todayKPI.labourCost.toLocaleString('pt-BR')}` : 'R$ 0',
      trend: labourTrend,
      icon: Users,
      color: todayKPI?.labourPercent && todayKPI.labourPercent > 20 ? 'red' : 
             todayKPI?.labourPercent && todayKPI.labourPercent > 15 ? 'yellow' : 'green',
      trendIsGood: !labourTrend.isUp
    },
    {
      title: 'Pedidos',
      value: todayKPI?.orders ? todayKPI.orders.toString() : '0',
      subtitle: todayKPI ? `Ticket Médio: R$ ${todayKPI.averageTicket}` : 'Ticket Médio: R$ 0',
      icon: ShoppingCart,
      color: 'blue'
    }
  ]
  
  const colorClasses = {
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600'
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-600'
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-600'
    },
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600'
    }
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        const colors = colorClasses[card.color as keyof typeof colorClasses]
        
        return (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${colors.bg}`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              {card.trend && card.trend.value > 0 && (
                <div className={`flex items-center gap-1 text-sm ${
                  card.trendIsGood ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.trend.isUp ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{card.trend.value}%</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">{card.title}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            )}
          </Card>
        )
      })}
    </div>
  )
}
