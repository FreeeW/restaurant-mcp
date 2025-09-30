// Enhanced KPI Cards component using rolling CMV
'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart, Loader2, Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { api } from '@/services/api'
import type { EnhancedDailyKPI } from '@/services/api'

interface KPICardsProps {
  date: Date
  ownerId: string
}

export default function KPICardsEnhanced({ date, ownerId }: KPICardsProps) {
  const [todayKPI, setTodayKPI] = useState<EnhancedDailyKPI | null>(null)
  const [yesterdayKPI, setYesterdayKPI] = useState<EnhancedDailyKPI | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!ownerId) return
    
    const fetchKPIs = async () => {
      setLoading(true)
      try {
        const dateStr = date.toISOString().split('T')[0]
        const yesterday = new Date(date)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        // Fetch both days with enhanced data
        const [today, yday] = await Promise.all([
          api.getDailyKPIEnhanced(ownerId, dateStr),
          api.getDailyKPIEnhanced(ownerId, yesterdayStr)
        ])
        
        setTodayKPI(today)
        setYesterdayKPI(yday)
      } catch (error) {
        console.error('Error fetching KPIs:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchKPIs()
  }, [date, ownerId])
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          </Card>
        ))}
      </div>
    )
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }
  
  const getPercentageChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0
    return ((current - previous) / previous) * 100
  }
  
  const getCMVColor = (percentage: number) => {
    if (percentage > 35) return 'text-red-600 bg-red-50'
    if (percentage > 30) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }
  
  const getLaborColor = (percentage: number) => {
    if (percentage > 30) return 'text-red-600 bg-red-50'
    if (percentage > 25) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Sales Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Vendas</span>
          </div>
          {yesterdayKPI && todayKPI && (
            <div className={`flex items-center gap-1 text-sm ${
              getPercentageChange(todayKPI.sales, yesterdayKPI.sales) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {getPercentageChange(todayKPI.sales, yesterdayKPI.sales) >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(getPercentageChange(todayKPI.sales, yesterdayKPI.sales)).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {todayKPI ? formatCurrency(todayKPI.sales) : '-'}
        </p>
        {todayKPI && todayKPI.orders > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {todayKPI.orders} pedidos • Ticket médio: {formatCurrency(todayKPI.average_ticket)}
          </p>
        )}
      </Card>
      
      {/* Enhanced CMV Card with Rolling Average */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">CMV</span>
            <div className="group relative">
              <Info className="w-3 h-3 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-xs rounded p-2 whitespace-nowrap">
                  Média móvel de 30 dias<br/>
                  Mais precisa que o cálculo diário
                </div>
              </div>
            </div>
          </div>
          {todayKPI?.is_purchase_day && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              📦 Recebimento
            </span>
          )}
        </div>
        
        {todayKPI ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">
                {todayKPI.rolling_cmv_percentage.toFixed(1)}%
              </p>
              <span className="text-xs text-gray-500">média 30d</span>
            </div>
            
            <div className={`text-xs px-2 py-1 rounded ${getCMVColor(todayKPI.rolling_cmv_percentage)}`}>
              {todayKPI.is_purchase_day 
                ? `Compras: ${formatCurrency(todayKPI.actual_purchases || 0)}`
                : `Teórico: ${formatCurrency(todayKPI.theoretical_food_cost)}`
              }
            </div>
          </div>
        ) : (
          <p className="text-2xl font-bold text-gray-400">-</p>
        )}
      </Card>
      
      {/* Labor Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Mão de Obra</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {todayKPI ? `${todayKPI.labor_cost_percentage.toFixed(1)}%` : '-'}
        </p>
        {todayKPI && (
          <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${getLaborColor(todayKPI.labor_cost_percentage)}`}>
            {formatCurrency(todayKPI.labor_cost)}
          </div>
        )}
      </Card>
      
      {/* Profit Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Lucro</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {todayKPI ? formatCurrency(todayKPI.profit) : '-'}
        </p>
        {todayKPI && todayKPI.profit_margin > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Margem: {todayKPI.profit_margin.toFixed(1)}%
          </p>
        )}
      </Card>
    </div>
  )
}
