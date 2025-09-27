// Appointments page with real Supabase data
'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, MapPin, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'

interface Appointment {
  id: string
  owner_id: string
  title: string
  date: string
  time?: string
  kind?: string
  notes?: string
  created_at: string
}

export default function AppointmentsPage() {
  const { owner } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  
  // Form fields
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [kind, setKind] = useState('geral')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const loadAppointments = async () => {
      if (!owner?.id) return
      
      setLoading(true)
      try {
        // Get appointments for next 30 days
        const today = new Date().toISOString().split('T')[0]
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 30)
        const future = futureDate.toISOString().split('T')[0]
        
        const data = await api.getAppointments(owner.id, today, future)
        setAppointments(data)
      } catch (error) {
        console.error('Error fetching appointments:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadAppointments()
  }, [owner])

  const fetchAppointments = async () => {
    if (!owner?.id) return
    
    setLoading(true)
    try {
      // Get appointments for next 30 days
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const future = futureDate.toISOString().split('T')[0]
      
      const data = await api.getAppointments(owner.id, today, future)
      setAppointments(data)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!owner?.id) return
    
    try {
      const appointmentData = {
        owner_id: owner.id,
        title,
        date,
        time: time || null,
        kind,
        notes: notes || null
      }
      
      if (editingAppointment) {
        // Update existing appointment
        // For now, we'll just refetch after creating
        await api.createAppointment(appointmentData)
      } else {
        // Create new appointment
        await api.createAppointment(appointmentData)
      }
      
      // Reset form
      setTitle('')
      setDate('')
      setTime('')
      setKind('geral')
      setNotes('')
      setShowForm(false)
      setEditingAppointment(null)
      
      // Refetch appointments
      await fetchAppointments()
    } catch (error) {
      console.error('Error saving appointment:', error)
    }
  }

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setTitle(appointment.title)
    setDate(appointment.date)
    setTime(appointment.time || '')
    setKind(appointment.kind || 'geral')
    setNotes(appointment.notes || '')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este compromisso?')) return
    
    // For now, we'll just refetch
    await fetchAppointments()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    })
  }

  const getKindColor = (kind?: string) => {
    const colors: Record<string, string> = {
      'manutenção': 'bg-orange-100 text-orange-800',
      'entrega': 'bg-blue-100 text-blue-800',
      'reunião': 'bg-purple-100 text-purple-800',
      'inspeção': 'bg-red-100 text-red-800',
      'geral': 'bg-gray-100 text-gray-800'
    }
    return colors[kind || 'geral'] || colors.geral
  }

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return aptDate >= today
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compromissos</h1>
          <p className="text-gray-600">
            {upcomingAppointments.length} compromissos próximos
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Novo Compromisso
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Manutenção do freezer"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="geral">Geral</option>
                  <option value="manutenção">Manutenção</option>
                  <option value="entrega">Entrega</option>
                  <option value="reunião">Reunião</option>
                  <option value="inspeção">Inspeção</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário (opcional)
                </label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
                placeholder="Detalhes adicionais..."
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false)
                  setEditingAppointment(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                {editingAppointment ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Appointments List */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Próximos Compromissos</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-500 mt-2">Carregando compromissos...</p>
          </div>
        ) : upcomingAppointments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {appointment.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getKindColor(appointment.kind)}`}>
                        {appointment.kind || 'geral'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(appointment.date)}</span>
                      </div>
                      
                      {appointment.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                        </div>
                      )}
                    </div>
                    
                    {appointment.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        {appointment.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(appointment)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(appointment.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Nenhum compromisso agendado</p>
            <p className="text-sm mt-1">Clique em &quot;Novo Compromisso&quot; para adicionar</p>
          </div>
        )}
      </Card>
    </div>
  )
}
