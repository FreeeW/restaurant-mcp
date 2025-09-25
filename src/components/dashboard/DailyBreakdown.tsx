// Daily Breakdown component with expandable details
'use client'

import { useState } from 'react'
import { DollarSign, Package, Users, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Clock, User, Truck } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { mockDailyKPIs, generateDailyHours, mockSuppliers } from '@/lib/mock-data'

interface DailyBreakdownProps {
  date: Date
}

export default function DailyBreakdown({ date }: DailyBreakdownProps) {
  const [expandedSection, setExpandedSection] = useState<'food' | 'labour' | null>(null)
  const dateStr = date.toISOString().split('T')[0]
  const kpi = mockDailyKPIs[dateStr]
  const hoursData = generateDailyHours(date)
  
  // Mock data for suppliers deliveries (in real app, this would come from DB)
  const mockDeliveries = [
    {
      supplier: mockSuppliers[0].name,
      amount: kpi ? kpi.foodCost * 0.4 : 0,
      invoice: 'NF-2024-' + Math.floor(Math.random() * 1000),
      items: ['Carnes', 'Aves', 'Peixes']
    },
    {
      supplier: mockSuppliers[2].name,
      amount: kpi ? kpi.foodCost * 0.25 : 0,
      invoice: 'NF-2024-' + Math.floor(Math.random() * 1000),
      items: ['Verduras', 'Legumes', 'Frutas']
    },
    {
      supplier: mockSuppliers[4].name,
      amount: kpi ? kpi.foodCost * 0.15 : 0,
      invoice: 'NF-2024-' + Math.floor(Math.random() * 1000),
      items: ['Pães', 'Bolos']
    },
    {
      supplier: 'Outros Fornecedores',
      amount: kpi ? kpi.foodCost * 0.2 : 0,
      invoice: '-',
      items: ['Diversos']
    }
  ]
  
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    return date.toLocaleDateString('pt-BR', options)
  }
  
  const toggleSection = (section: 'food' | 'labour') => {
    setExpandedSection(expandedSection === section ? null : section)
  }
  
  if (!kpi) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Detalhes do Dia</h3>
          <p className="text-sm text-gray-600">{formatDate(date)}</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Sem dados para este dia</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const metrics = [
    {
      label: 'Vendas Brutas',
      value: `R$ ${kpi.sales.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: 'text-green-600',
      expandable: false
    },
    {
      label: 'Custo de Mercadoria (CMV)',
      value: `R$ ${kpi.foodCost.toLocaleString('pt-BR')}`,
      percent: `${kpi.foodPercent}%`,
      icon: Package,
      color: kpi.foodPercent > 35 ? 'text-red-600' : 
             kpi.foodPercent > 30 ? 'text-yellow-600' : 'text-green-600',
      expandable: true,
      expandKey: 'food' as const
    },
    {
      label: 'Custo de Mão de Obra',
      value: `R$ ${kpi.labourCost.toLocaleString('pt-BR')}`,
      percent: `${kpi.labourPercent}%`,
      icon: Users,
      color: kpi.labourPercent > 20 ? 'text-red-600' : 
             kpi.labourPercent > 15 ? 'text-yellow-600' : 'text-green-600',
      expandable: true,
      expandKey: 'labour' as const
    }
  ]
  
  const profit = kpi.sales - kpi.foodCost - kpi.labourCost
  const profitMargin = Math.round((profit / kpi.sales) * 100)
  
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Detalhes do Dia</h3>
        <p className="text-sm text-gray-600">{formatDate(date)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics */}
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          const isExpanded = metric.expandKey && expandedSection === metric.expandKey
          
          return (
            <div key={index}>
              <div 
                className={`flex items-center justify-between py-3 border-b ${
                  metric.expandable ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors' : ''
                }`}
                onClick={() => metric.expandKey && toggleSection(metric.expandKey)}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      {metric.label}
                      {metric.expandable && (
                        <span className="text-xs text-blue-600">(clique para detalhes)</span>
                      )}
                    </p>
                    <p className="font-semibold">{metric.value}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {metric.percent && (
                    <span className={`text-lg font-bold ${metric.color}`}>
                      {metric.percent}
                    </span>
                  )}
                  {metric.expandable && (
                    isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>
              
              {/* Expanded Content - Food Cost Details */}
              {metric.expandKey === 'food' && isExpanded && (
                <div className="mt-3 pl-8 space-y-2 animate-in slide-in-from-top-1">
                  <p className="text-xs font-medium text-gray-700 mb-2">Fornecedores do dia:</p>
                  {mockDeliveries.map((delivery, idx) => (
                    <div key={idx} className="flex items-start justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-start gap-2">
                        <Truck className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-800">{delivery.supplier}</p>
                          <p className="text-xs text-gray-600">
                            {delivery.items.join(', ')}
                          </p>
                          {delivery.invoice !== '-' && (
                            <p className="text-xs text-gray-500 mt-1">
                              NF: {delivery.invoice}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="font-medium text-gray-900">
                        R$ {delivery.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Expanded Content - Labour Cost Details */}
              {metric.expandKey === 'labour' && isExpanded && (
                <div className="mt-3 pl-8 space-y-2 animate-in slide-in-from-top-1">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Funcionários ({hoursData.employees.length} trabalharam):
                  </p>
                  {hoursData.employees.slice(0, 5).map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-800">{emp.name}</p>
                          <p className="text-xs text-gray-600">{emp.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {emp.hours}h × R$ {emp.hourlyRate.toFixed(2)}
                        </p>
                        <p className="font-medium text-gray-900">
                          R$ {emp.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {hoursData.employees.length > 5 && (
                    <p className="text-xs text-gray-500 text-center pt-1">
                      +{hoursData.employees.length - 5} funcionários...
                    </p>
                  )}
                  <div className="pt-2 mt-2 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total de horas:</span>
                      <span className="font-medium">{hoursData.totalHours}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Custo total:</span>
                      <span className="font-medium">R$ {hoursData.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        
        {/* Profit Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Lucro Bruto</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            R$ {profit.toLocaleString('pt-BR')}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Margem: {profitMargin}%
          </p>
        </div>
        
        {/* Additional Stats */}
        {kpi.orders && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{kpi.orders}</p>
              <p className="text-xs text-gray-600">Pedidos</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                R$ {kpi.averageTicket}
              </p>
              <p className="text-xs text-gray-600">Ticket Médio</p>
            </div>
          </div>
        )}
        
        {/* Performance Indicators */}
        <div className="mt-4 space-y-2">
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Performance CMV</span>
              <span className={
                kpi.foodPercent <= 30 ? 'text-green-600' : 
                kpi.foodPercent <= 35 ? 'text-yellow-600' : 'text-red-600'
              }>
                {kpi.foodPercent <= 30 ? 'Excelente' : 
                 kpi.foodPercent <= 35 ? 'Atenção' : 'Crítico'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  kpi.foodPercent <= 30 ? 'bg-green-500' : 
                  kpi.foodPercent <= 35 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(kpi.foodPercent * 2, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Performance Mão de Obra</span>
              <span className={
                kpi.labourPercent <= 15 ? 'text-green-600' : 
                kpi.labourPercent <= 20 ? 'text-yellow-600' : 'text-red-600'
              }>
                {kpi.labourPercent <= 15 ? 'Excelente' : 
                 kpi.labourPercent <= 20 ? 'Atenção' : 'Crítico'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  kpi.labourPercent <= 15 ? 'bg-green-500' : 
                  kpi.labourPercent <= 20 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(kpi.labourPercent * 3, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
