// Component to show the difference between purchase-based and rolling CMV
import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

interface CMVComparisonChartProps {
  data: Array<{
    date: string
    purchases: number
    sales: number
    dailyCMV: number  // Purchase-based (spiky)
    rollingCMV: number  // 30-day average (smooth)
  }>
  targetCMV?: number  // Target percentage
}

export function CMVComparisonChart({ data, targetCMV = 30 }: CMVComparisonChartProps) {
  // Format data for the chart
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    'CMV Diário (Compras)': item.dailyCMV,
    'CMV Real (Média 30d)': item.rollingCMV,
    'Meta': targetCMV
  }))
  
  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Comparação de Métodos de CMV</h3>
          <p className="text-sm text-gray-600">
            Por que usar média móvel ao invés de compras diárias
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                ticks={[0, 20, 30, 40, 60, 80, 100]}
                label={{ value: 'CMV %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(1)}%`}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              
              {/* Reference line for target */}
              <ReferenceLine 
                y={targetCMV} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                label={{ value: "Meta", position: "left" }}
              />
              
              {/* Daily CMV - Spiky line */}
              <Line 
                type="monotone" 
                dataKey="CMV Diário (Compras)" 
                stroke="#ef4444" 
                strokeWidth={1}
                dot={{ r: 2 }}
                opacity={0.5}
              />
              
              {/* Rolling CMV - Smooth line */}
              <Line 
                type="monotone" 
                dataKey="CMV Real (Média 30d)" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full opacity-50"></div>
                <span className="font-medium text-sm">CMV por Compras (Problemático)</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Picos nos dias de recebimento (50-90%)</li>
                <li>• Zero nos dias sem compras</li>
                <li>• Não reflete consumo real</li>
                <li>• Dificulta tomada de decisão</li>
              </ul>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-sm">CMV Média Móvel (Recomendado)</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Visão realista do consumo</li>
                <li>• Suaviza variações de entrega</li>
                <li>• Facilita identificar tendências</li>
                <li>• Base sólida para decisões</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Summary card showing the problem and solution
export function CMVMethodExplanation() {
  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <h4 className="font-semibold text-blue-900 mb-2">
        💡 Por que mudamos o cálculo do CMV?
      </h4>
      <div className="space-y-2 text-sm text-gray-700">
        <p>
          <span className="font-medium">Problema anterior:</span> Calculávamos CMV baseado nas compras do dia, 
          resultando em 80% no dia de recebimento e 0% nos outros dias.
        </p>
        <p>
          <span className="font-medium">Solução atual:</span> Usamos média móvel de 30 dias, 
          que mostra o CMV real do seu negócio, considerando que produtos comprados hoje 
          serão consumidos ao longo de vários dias.
        </p>
        <p className="text-xs text-blue-700 mt-2">
          ℹ️ Dias com 📦 indicam recebimento de mercadorias, mas o CMV mostrado 
          sempre reflete a média de consumo real.
        </p>
      </div>
    </div>
  )
}
