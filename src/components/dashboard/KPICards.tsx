// KPI Cards component with real data from Supabase
'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { api } from '@/services/api'

interface KPICardsProps {
  date: Date
  ownerId: string
}

export default function KPICards({ date, ownerId }: KPICardsProps) {
  const [todayKPI, setTodayKPI] = useState<any>(null)
  const [yesterdayKPI, setYesterdayKPI] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!ownerId) return
    
    const fetchKPIs = async () => {
      setLoading(true)
      try {
        // Get today's date string
        const dateStr = date.toISOString().split('T')[0]
        
        // Get yesterday's date
        const yesterday = new Date(date)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        // Fetch both days' KPIs
        const [todayData, yesterdayData] = await Promise.all([
          api.getDailyKPI(ownerId, dateStr),
          api.getDailyKPI(ownerId, yesterdayStr)
        ])
        
        setTodayKPI(todayData)
        setYesterdayKPI(yesterdayData)
      } catch (error) {
        console.error('Error fetching KPIs:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchKPIs()
  }, [date, ownerId])
  
  const calculateTrend = (current?: number, previous?: number) => {
    if (!current || !previous) return { value: 0, isUp: false }
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(Math.round(change)), isUp: change > 0 }
  }
  
  const salesTrend = calculateTrend(todayKPI?.sales, yesterdayKPI?.sales)
  const foodTrend = calculateTrend(todayKPI?.food_cost_percentage, yesterdayKPI?.food_cost_percentage)
  const labourTrend = calculateTrend(todayKPI?.labor_cost_percentage, yesterdayKPI?.labor_cost_percentage)
  
  const cards = [
    {
      title: 'Vendas do Dia',
      value: todayKPI ? `R$ ${todayKPI.sales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00',
      trend: salesTrend,
      icon: DollarSign,
      color: 'green',
      trendIsGood: salesTrend.isUp
    },
    {
      title: 'CMV (Food Cost)',
      value: todayKPI?.food_cost_percentage ? `${todayKPI.food_cost_percentage.toFixed(1)}%` : '0%',
      subtitle: todayKPI ? `R$ ${todayKPI.food_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00',
      trend: foodTrend,
      icon: Package,
      color: todayKPI?.food_cost_percentage && todayKPI.food_cost_percentage > 35 ? 'red' : 
             todayKPI?.food_cost_percentage && todayKPI.food_cost_percentage > 30 ? 'yellow' : 'green',
      trendIsGood: !foodTrend.isUp
    },
    {
      title: 'Mão de Obra',
      value: todayKPI?.labor_cost_percentage ? `${todayKPI.labor_cost_percentage.toFixed(1)}%` : '0%',
      subtitle: todayKPI ? `R$ ${todayKPI.labor_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00',
      trend: labourTrend,
      icon: Users,
      color: todayKPI?.labor_cost_percentage && todayKPI.labor_cost_percentage > 30 ? 'red' : 
             todayKPI?.labor_cost_percentage && todayKPI.labor_cost_percentage > 25 ? 'yellow' : 'green',
      trendIsGood: !labourTrend.isUp
    },
    {
      title: 'Pedidos',
      value: todayKPI?.orders ? todayKPI.orders.toString() : '0',
      subtitle: todayKPI && todayKPI.orders > 0 
        ? `Ticket: R$ ${todayKPI.average_ticket.toFixed(2)}` 
        : 'Ticket: R$ 0,00',
      icon: ShoppingCart,
      color: 'blue'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        const colorClasses = {
          green: 'bg-green-100 text-green-600',
          yellow: 'bg-yellow-100 text-yellow-600',
          red: 'bg-red-100 text-red-600',
          blue: 'bg-blue-100 text-blue-600'
        }
        
        return (
          <Card key={card.title} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                <Icon className="w-5 h-5" />
              </div>
              {card.trend && card.trend.value > 0 && (
                <div className={`flex items-center gap-1 text-sm ${
                  card.trendIsGood 
                    ? 'text-green-600' 
                    : 'text-red-600'
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
            
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.subtitle && (
                <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}