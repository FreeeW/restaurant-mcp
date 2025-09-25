// Fixed Costs page
'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { mockFixedCosts } from '@/lib/mock-data'

export default function FixedCostsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingCost, setEditingCost] = useState<any>(null)
  const [costs, setCosts] = useState(mockFixedCosts)
  
  // Calcular totais
  const totalMonthly = costs
    .filter(c => c.frequency === 'monthly')
    .reduce((sum, c) => sum + c.amount, 0)
  
  const totalAnnual = costs
    .filter(c => c.frequency === 'annual')
    .reduce((sum, c) => sum + c.amount, 0)
  
  const totalMonthlyEquivalent = totalMonthly + (totalAnnual / 12)
  
  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este custo fixo?')) {
      setCosts(costs.filter(c => c.id !== id))
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custos Fixos</h1>
          <p className="text-gray-600">Gerencie os custos fixos do seu restaurante</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Custo
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Mensal</p>
              <p className="text-2xl font-bold">R$ {totalMonthly.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Anual</p>
              <p className="text-2xl font-bold">R$ {totalAnnual.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Média Mensal</p>
              <p className="text-2xl font-bold">R$ {totalMonthlyEquivalent.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Qtd. Custos</p>
              <p className="text-2xl font-bold">{costs.length}</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Cost List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Costs */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Custos Mensais</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costs.filter(c => c.frequency === 'monthly').length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum custo mensal cadastrado
                </p>
              ) : (
                costs
                  .filter(c => c.frequency === 'monthly')
                  .map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">{cost.name}</p>
                        <p className="text-sm text-gray-600">{cost.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            R$ {cost.amount.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Vence dia {cost.dueDay}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingCost(cost)
                              setShowForm(true)
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cost.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Annual Costs */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Custos Anuais</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costs.filter(c => c.frequency === 'annual').length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum custo anual cadastrado
                </p>
              ) : (
                costs
                  .filter(c => c.frequency === 'annual')
                  .map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">{cost.name}</p>
                        <p className="text-sm text-gray-600">{cost.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            R$ {cost.amount.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Vence: {cost.dueMonth}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingCost(cost)
                              setShowForm(true)
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cost.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-lg font-semibold">
                {editingCost ? 'Editar Custo Fixo' : 'Novo Custo Fixo'}
              </h2>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault()
                // Handle form submission
                setShowForm(false)
                setEditingCost(null)
              }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Custo
                  </label>
                  <Input
                    defaultValue={editingCost?.name}
                    placeholder="Ex: Aluguel, Internet, Energia"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={editingCost?.amount}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequência
                    </label>
                    <select
                      defaultValue={editingCost?.frequency || 'monthly'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="annual">Anual</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    defaultValue={editingCost?.category || 'Operacional'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Aluguel">Aluguel</option>
                    <option value="Utilidades">Utilidades</option>
                    <option value="Impostos">Impostos</option>
                    <option value="Seguros">Seguros</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false)
                      setEditingCost(null)
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1">
                    {editingCost ? 'Salvar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
