// Settings page
'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Building, Phone, Mail, Clock, Bell, CreditCard } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie as configurações do seu restaurante</p>
      </div>
      
      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restaurant Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-gray-600" />
            Informações do Restaurante
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Restaurante
              </label>
              <Input defaultValue="Restaurante Demo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ
              </label>
              <Input defaultValue="12.345.678/0001-90" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço
              </label>
              <Input defaultValue="Rua Exemplo, 123 - São Paulo, SP" />
            </div>
          </div>
        </Card>
        
        {/* Contact Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-gray-600" />
            Informações de Contato
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp
              </label>
              <Input defaultValue="(11) 99999-9999" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input type="email" defaultValue="demo@restaurant.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone Fixo
              </label>
              <Input defaultValue="(11) 3333-4444" />
            </div>
          </div>
        </Card>
        
        {/* Operating Hours */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Horário de Funcionamento
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Abertura
              </label>
              <Input type="time" defaultValue="11:00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Fechamento
              </label>
              <Input type="time" defaultValue="22:00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dias de Funcionamento
              </label>
              <div className="flex gap-2 flex-wrap">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                  <button
                    key={day}
                    className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-sm"
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
        
        {/* Notifications */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            Notificações
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-emerald-600" defaultChecked />
              <span className="text-sm">Lembrete de fechamento diário</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-emerald-600" defaultChecked />
              <span className="text-sm">Alerta de vencimento de alvarás</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-emerald-600" />
              <span className="text-sm">Resumo semanal de vendas</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-emerald-600" defaultChecked />
              <span className="text-sm">Alertas de estoque baixo</span>
            </label>
          </div>
        </Card>
        
        {/* Subscription */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-600" />
            Assinatura
          </h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Plano Atual</p>
              <p className="text-xl font-semibold">Trial - 14 dias restantes</p>
            </div>
            <Button variant="primary">
              Fazer Upgrade
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary">Cancelar</Button>
        <Button variant="primary">Salvar Configurações</Button>
      </div>
    </div>
  )
}
