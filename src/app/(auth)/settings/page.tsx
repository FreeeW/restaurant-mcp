// Settings page with real Supabase data
'use client'

import { useState, useEffect } from 'react'
import { Save, Bell, Clock, Users, Smartphone, Building, Mail, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { formatPhoneToE164, formatPhoneDisplay } from '@/lib/supabase'

export default function SettingsPage() {
  const { owner } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Form fields
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [managerPhone, setManagerPhone] = useState('')
  const [closingTime, setClosingTime] = useState('21:30')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [employeeCheckMode, setEmployeeCheckMode] = useState('form')
  const [employeeReminderTime, setEmployeeReminderTime] = useState('07:30')
  const [employeeReminderEnabled, setEmployeeReminderEnabled] = useState(false)

  useEffect(() => {
    if (owner) {
      // Load owner data into form
      setBusinessName(owner.business_name || '')
      setEmail(owner.email || '')
      setPhone(formatPhoneDisplay(owner.phone_e164))
      setManagerPhone(owner.manager_phone_e164 ? formatPhoneDisplay(owner.manager_phone_e164) : '')
      setClosingTime(owner.closing_time || '21:30')
      setReminderEnabled(owner.closing_reminder_enabled || false)
      setEmployeeCheckMode(owner.employee_check_mode || 'form')
      
      // These fields might not exist yet
      if (owner.employee_reminder_time) {
        setEmployeeReminderTime(owner.employee_reminder_time)
      }
      if (owner.employee_reminder_enabled) {
        setEmployeeReminderEnabled(owner.employee_reminder_enabled)
      }
    }
  }, [owner])

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }

  const handleSave = async () => {
    if (!owner?.id) return
    
    setLoading(true)
    setSaved(false)
    
    try {
      await api.updateOwnerSettings(owner.id, {
        business_name: businessName,
        email: email || null,
        phone_e164: formatPhoneToE164(phone),
        manager_phone_e164: managerPhone ? formatPhoneToE164(managerPhone) : null,
        closing_time: closingTime,
        closing_reminder_enabled: reminderEnabled && !!managerPhone,
        employee_check_mode: employeeCheckMode,
        employee_reminder_time: employeeReminderTime,
        employee_reminder_enabled: employeeReminderEnabled
      })
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  if (!owner) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie as configurações do seu restaurante</p>
      </div>

      {/* Restaurant Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-gray-600" />
          Informações do Restaurante
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Restaurante
            </label>
            <Input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Pizzaria do João"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@restaurante.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Principal
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Operating Hours */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Horário de Funcionamento
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horário de Fechamento
            </label>
            <Input
              type="time"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Horário que o restaurante encerra o expediente
            </p>
          </div>
        </div>
      </Card>

      {/* Manager Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          Configurações do Gerente
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp do Gerente
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="tel"
                value={managerPhone}
                onChange={(e) => setManagerPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Deixe em branco se você mesmo gerencia
            </p>
          </div>
          
          {managerPhone && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <p className="font-medium text-gray-700">
                    Lembrete diário de vendas
                  </p>
                  <p className="text-sm text-gray-600">
                    Enviar lembrete às {closingTime} para informar vendas via WhatsApp
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Employee Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          Configurações de Funcionários
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modo de Registro de Ponto
            </label>
            <select
              value={employeeCheckMode}
              onChange={(e) => setEmployeeCheckMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="form">Formulário Web</option>
              <option value="whatsapp">WhatsApp Individual</option>
              <option value="both">Ambos</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Como os funcionários registram entrada/saída
            </p>
          </div>
          
          {employeeCheckMode !== 'form' && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={employeeReminderEnabled}
                  onChange={(e) => setEmployeeReminderEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <p className="font-medium text-gray-700">
                    Lembrete de entrada
                  </p>
                  <p className="text-sm text-gray-600">
                    Enviar lembrete diário para funcionários registrarem entrada
                  </p>
                </div>
              </label>
              
              {employeeReminderEnabled && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horário do lembrete
                  </label>
                  <Input
                    type="time"
                    value={employeeReminderTime}
                    onChange={(e) => setEmployeeReminderTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          variant="primary"
          disabled={loading || saved}
          className="min-w-[120px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
