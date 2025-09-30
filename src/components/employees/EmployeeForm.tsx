// Employee Form component
'use client'

import { useState } from 'react'
import { X, Phone, MessageSquare, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import type { Employee } from '@/services/api'

interface EmployeeFormProps {
  employee?: Employee | null
  onClose: () => void
  onSave: (data: Partial<Employee>) => void
}

export default function EmployeeForm({ employee, onClose, onSave }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    code: employee?.code || '',
    name: employee?.name || '',
    role: employee?.role || '',
    hourly_rate: employee?.hourly_rate || 0,
    phone: employee?.phone || '',
    phone_e164: employee?.phone_e164 || '',
    email: employee?.email || '',
    contract_type: employee?.contract_type || 'hourly' as 'hourly' | 'clt' | 'daily',
    monthly_salary: employee?.monthly_salary || 0,
    active: employee?.active ?? true
  })
  
  const formatWhatsApp = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Keep only digits, starting with 55
    if (!digits.startsWith('55')) {
      return '55' + digits
    }
    return digits.slice(0, 13) // 5511999999999 = 13 digits
  }
  
  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value)
    setFormData({ ...formData, phone_e164: formatted })
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {employee ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="GAR1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Contrato
              </label>
              <select
                value={formData.contract_type}
                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as 'hourly' | 'clt' | 'daily' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="hourly">Horista</option>
                <option value="clt">CLT</option>
                <option value="daily">Diarista</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-3 h-3 inline mr-1" />
                Valor/Hora
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                placeholder="15.50"
                required
              />
            </div>
            
            {formData.contract_type === 'clt' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Salário Mensal
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthly_salary}
                  onChange={(e) => setFormData({ ...formData, monthly_salary: parseFloat(e.target.value) })}
                  placeholder="3000.00"
                />
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="João Silva"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargo
            </label>
            <Input
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="Garçom"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-3 h-3 inline mr-1" />
              Telefone
            </label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              WhatsApp (para registro de ponto)
            </label>
            <Input
              value={formData.phone_e164}
              onChange={handleWhatsAppChange}
              placeholder="5511999999999"
            />
            <p className="text-xs text-gray-500 mt-1">
              Número para registro de ponto via WhatsApp (enviar &quot;cheguei&quot; e &quot;sai&quot;)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@email.com"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-emerald-600"
              />
              <span className="text-sm text-gray-700">Funcionário ativo</span>
            </label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              {employee ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
