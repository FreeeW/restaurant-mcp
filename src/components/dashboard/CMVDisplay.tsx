// Enhanced KPI Card showing both actual purchases and rolling CMV
import React from 'react'
import { TrendingUp, TrendingDown, Package, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface CMVDisplayProps {
  dailySales: number
  actualPurchases: number  // Purchases made today
  rollingCMV: number  // 30-day rolling average percentage
  theoreticalFoodCost: number  // Expected food cost based on rolling average
  isPurchaseDay: boolean
  rollingPeriodDays?: number
}

export function CMVDisplay({ 
  dailySales,
  actualPurchases,
  rollingCMV,
  theoreticalFoodCost,
  isPurchaseDay,
  rollingPeriodDays = 30
}: CMVDisplayProps) {
  // Determine display mode based on whether purchases were made
  const displayMode = isPurchaseDay ? 'purchase' : 'theoretical'
  
  // Calculate daily CMV if purchases were made
  const dailyCMV = dailySales > 0 ? (actualPurchases / dailySales) * 100 : 0
  
  // Determine color based on rolling CMV (the metric that matters)
  const getCMVColor = (percentage: number) => {
    if (percentage > 35) return 'red'
    if (percentage > 30) return 'yellow'
    return 'green'
  }
  
  const color = getCMVColor(rollingCMV)
  const colorClasses = {
    red: 'bg-red-100 text-red-700 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    green: 'bg-green-100 text-green-700 border-green-200'
  }
  
  return (
    <div className="space-y-3">
      {/* Main CMV Display - Always show rolling average */}
      <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="font-medium">CMV</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 opacity-60" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">
                    Média móvel de {rollingPeriodDays} dias<br/>
                    Mais precisa que o cálculo diário
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{rollingCMV.toFixed(1)}%</p>
            <p className="text-xs opacity-75">Média {rollingPeriodDays} dias</p>
          </div>
        </div>
      </div>
      
      {/* Secondary Information */}
      <div className="grid grid-cols-2 gap-2">
        {/* Today's Activity */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">
            {isPurchaseDay ? '📦 Compras Hoje' : '📊 CMV Teórico'}
          </p>
          <p className="text-sm font-bold text-gray-900">
            R$ {isPurchaseDay ? actualPurchases.toLocaleString('pt-BR') : theoreticalFoodCost.toLocaleString('pt-BR')}
          </p>
          {isPurchaseDay && (
            <p className="text-xs text-gray-500 mt-1">
              {dailyCMV.toFixed(1)}% das vendas
            </p>
          )}
        </div>
        
        {/* Trend Indicator */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Tendência</p>
          <div className="flex items-center gap-1">
            {rollingCMV > 32 ? (
              <>
                <TrendingUp className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">Alta</span>
              </>
            ) : rollingCMV < 28 ? (
              <>
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Baixa</span>
              </>
            ) : (
              <span className="text-sm font-medium text-gray-600">Estável</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Purchase Day Indicator */}
      {isPurchaseDay && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <span className="font-medium">📦 Dia de Recebimento:</span> O CMV mostrado é a média móvel. 
          Compras de hoje impactarão os próximos {rollingPeriodDays} dias.
        </div>
      )}
    </div>
  )
}

// Mini version for calendar/week views
export function CMVBadge({ 
  percentage, 
  isRolling = true,
  isPurchaseDay = false 
}: { 
  percentage: number
  isRolling?: boolean
  isPurchaseDay?: boolean
}) {
  const getColor = () => {
    if (percentage > 35) return 'bg-red-100 text-red-700'
    if (percentage > 30) return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${getColor()}`}>
      {isPurchaseDay && '📦'}
      {percentage.toFixed(1)}%
      {isRolling && (
        <span className="opacity-60" title="Média móvel">
          ↻
        </span>
      )}
    </span>
  )
}
