// Daily Breakdown component with real data from Supabase
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { DollarSign, Users, Package, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/services/api'

interface DailyBreakdownProps {
  date: Date
  ownerId: string
}

export default function DailyBreakdown({ date, ownerId }: DailyBreakdownProps) {
  const [data, setData] = useState<any>(null)
  const [laborData, setLaborData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!ownerId) return
    
    const fetchData = async () => {
      setLoading(true)
      try {
        const dateStr = date.toISOString().split('T')[0]
        
        // Fetch daily KPI and labor data
        const [kpiData, laborDetails] = await Promise.all([
          api.getDailyKPI(ownerId, dateStr),
          api.getDailyLabor(ownerId, dateStr)
        ])
        
        setData(kpiData)
        setLaborData(laborDetails || [])
      } catch (error) {
        console.error('Error fetching daily breakdown:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [date, ownerId])
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Card>
    )
  }
  
  const hasData = data && data.sales > 0
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        Resumo do Dia
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {formatDate(date)}
      </p>
      
      {hasData ? (
        <>
          {/* Revenue Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-medium">Receita</span>
              </div>
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(data.sales)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {data.orders > 0 && (
                <>
                  <p>{data.orders} pedidos</p>
                  <p>Ticket médio: {formatCurrency(data.average_ticket)}</p>
                </>
              )}
            </div>
          </div>
          
          {/* Costs Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                <span className="text-sm">CMV</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{formatCurrency(data.food_cost)}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {data.food_cost_percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Mão de Obra</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{formatCurrency(data.labor_cost)}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {data.labor_cost_percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Profit Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="font-medium">Lucro Bruto</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(data.profit)}
                </p>
                <p className="text-xs text-gray-500">
                  {data.profit_margin.toFixed(1)}% margem
                </p>
              </div>
            </div>
          </div>
          
          {/* Labor Details */}
          {laborData.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Funcionários do Dia</h4>
              <div className="space-y-2">
                {laborData.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.payload?.code || 'N/A'}
                    </span>
                    <span className="text-gray-900">
                      {item.payload?.hours ? `${item.payload.hours}h` : '-'}
                    </span>
                  </div>
                ))}
                {laborData.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{laborData.length - 5} funcionários
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Alerts */}
          {data.food_cost_percentage > 35 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-900">CMV Alto</p>
                  <p className="text-red-700">
                    Custo acima de 35% afeta a lucratividade
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {data.labor_cost_percentage > 30 && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900">Mão de Obra Elevada</p>
                  <p className="text-yellow-700">
                    Considere otimizar a escala de funcionários
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Sem dados para este dia</p>
          <p className="text-sm text-gray-400 mt-1">
            Registre as vendas do dia para ver o resumo
          </p>
        </div>
      )}
    </Card>
  )
}
