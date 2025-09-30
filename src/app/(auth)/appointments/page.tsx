// Enhanced Appointments page with timeline view and reminders
'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Bell, 
  BellOff,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
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
  reminder_sent_at?: string
}

type TimeSection = 'past' | 'today' | 'upcoming'

export default function AppointmentsPage() {
  const { owner } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<TimeSection>('upcoming')
  
  // Form fields
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [kind, setKind] = useState('geral')
  const [notes, setNotes] = useState('')
  const [enableReminder, setEnableReminder] = useState(true)

  useEffect(() => {
    loadAppointments()
  }, [owner])

  const loadAppointments = async () => {
    if (!owner?.id) return
    
    setLoading(true)
    try {
      // Get appointments for past 30 days and next 90 days
      const today = new Date()
      const pastDate = new Date(today)
      pastDate.setDate(pastDate.getDate() - 30)
      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + 90)
      
      const data = await api.getAppointments(
        owner.id, 
        pastDate.toISOString().split('T')[0],
        futureDate.toISOString().split('T')[0]
      )
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
        // Update would go here when API supports it
        await api.createAppointment(appointmentData)
      } else {
        await api.createAppointment(appointmentData)
      }
      
      resetForm()
      await loadAppointments()
      
      // Scroll to the relevant section
      const aptDate = new Date(date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (aptDate < today) setActiveSection('past')
      else if (aptDate.getTime() === today.getTime()) setActiveSection('today')
      else setActiveSection('upcoming')
      
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
    setEnableReminder(!!appointment.time && !appointment.reminder_sent_at)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    
    try {
      await api.deleteAppointment(deletingId)
      await loadAppointments()
      setDeletingId(null)
    } catch (error) {
      console.error('Error deleting appointment:', error)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDate('')
    setTime('')
    setKind('geral')
    setNotes('')
    setEnableReminder(true)
    setShowForm(false)
    setEditingAppointment(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    })
  }

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getKindColor = (kind?: string) => {
    const colors: Record<string, string> = {
      'manutenção': 'bg-orange-100 text-orange-700 border-orange-200',
      'entrega': 'bg-blue-100 text-blue-700 border-blue-200',
      'reunião': 'bg-purple-100 text-purple-700 border-purple-200',
      'inspeção': 'bg-red-100 text-red-700 border-red-200',
      'geral': 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[kind || 'geral'] || colors.geral
  }

  const getKindIcon = (kind?: string) => {
    const icons: Record<string, string> = {
      'manutenção': '🔧',
      'entrega': '📦',
      'reunião': '👥',
      'inspeção': '🔍',
      'geral': '📅'
    }
    return icons[kind || 'geral'] || icons.geral
  }

  // Categorize appointments
  const categorizedAppointments = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const past: Appointment[] = []
    const todayAppts: Appointment[] = []
    const upcoming: Appointment[] = []

    appointments.forEach(apt => {
      if (apt.date < todayStr) {
        past.push(apt)
      } else if (apt.date === todayStr) {
        todayAppts.push(apt)
      } else {
        upcoming.push(apt)
      }
    })

    // Sort past in descending order (most recent first)
    past.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return (b.time || '').localeCompare(a.time || '')
    })

    // Sort today and upcoming in ascending order
    const sortAsc = (a: Appointment, b: Appointment) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return (a.time || '').localeCompare(b.time || '')
    }

    todayAppts.sort(sortAsc)
    upcoming.sort(sortAsc)

    return { past, today: todayAppts, upcoming }
  }, [appointments])

  const AppointmentCard = ({ appointment, isPast = false }: { appointment: Appointment; isPast?: boolean }) => {
    const hasReminder = !!appointment.time && !appointment.reminder_sent_at
    const reminderSent = !!appointment.reminder_sent_at
    
    return (
      <div 
        className={`group p-4 hover:bg-gray-50 transition-colors border-l-4 ${
          isPast ? 'border-l-gray-300 opacity-75' : 'border-l-emerald-500'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl" role="img" aria-label={appointment.kind || 'geral'}>
                {getKindIcon(appointment.kind)}
              </span>
              <h3 className="font-semibold text-gray-900 truncate">
                {appointment.title}
              </h3>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${getKindColor(appointment.kind)}`}>
                {appointment.kind || 'geral'}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{formatDate(appointment.date)}</span>
              </div>
              
              {appointment.time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{appointment.time}</span>
                </div>
              )}

              {reminderSent && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">Lembrete enviado</span>
                </div>
              )}

              {hasReminder && !reminderSent && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Bell className="w-4 h-4" />
                  <span className="text-xs">Lembrete ativo</span>
                </div>
              )}
            </div>
            
            {appointment.notes && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {appointment.notes}
              </p>
            )}
          </div>
          
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleEdit(appointment)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(appointment.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const EmptyState = ({ section }: { section: TimeSection }) => {
    const messages = {
      past: {
        icon: '📅',
        title: 'Nenhum compromisso passado',
        description: 'Seus compromissos anteriores aparecerão aqui'
      },
      today: {
        icon: '✨',
        title: 'Nada agendado para hoje',
        description: 'Aproveite seu dia!'
      },
      upcoming: {
        icon: '🗓️',
        title: 'Nenhum compromisso futuro',
        description: 'Clique em "Novo Compromisso" para adicionar'
      }
    }

    const msg = messages[section]

    return (
      <div className="py-12 text-center text-gray-500">
        <div className="text-5xl mb-3">{msg.icon}</div>
        <p className="font-medium text-gray-700">{msg.title}</p>
        <p className="text-sm mt-1">{msg.description}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compromissos</h1>
          <p className="text-gray-600 mt-1">
            {categorizedAppointments.today.length > 0 && (
              <span className="font-medium text-emerald-600">
                {categorizedAppointments.today.length} hoje
              </span>
            )}
            {categorizedAppointments.today.length > 0 && categorizedAppointments.upcoming.length > 0 && ' • '}
            {categorizedAppointments.upcoming.length > 0 && (
              <span>
                {categorizedAppointments.upcoming.length} próximos
              </span>
            )}
            {categorizedAppointments.today.length === 0 && categorizedAppointments.upcoming.length === 0 && (
              'Gerencie seus compromissos e lembretes'
            )}
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}
              </h2>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
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
                    Data *
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
                    Horário
                  </label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                  {time && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Você receberá um lembrete 1h antes no WhatsApp
                    </p>
                  )}
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
                    <option value="geral">📅 Geral</option>
                    <option value="manutenção">🔧 Manutenção</option>
                    <option value="entrega">📦 Entrega</option>
                    <option value="reunião">👥 Reunião</option>
                    <option value="inspeção">🔍 Inspeção</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={3}
                  placeholder="Detalhes adicionais..."
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  {editingAppointment ? 'Salvar Alterações' : 'Criar Compromisso'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Timeline Sections */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'today' as TimeSection, label: 'Hoje', count: categorizedAppointments.today.length },
          { key: 'upcoming' as TimeSection, label: 'Próximos', count: categorizedAppointments.upcoming.length },
          { key: 'past' as TimeSection, label: 'Passados', count: categorizedAppointments.past.length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeSection === key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                activeSection === key
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <Card>
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-500 mt-2">Carregando compromissos...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Today's Appointments */}
          {activeSection === 'today' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                  <h2 className="text-lg font-semibold">Hoje</h2>
                  <span className="text-sm text-gray-500">
                    {formatFullDate(new Date().toISOString().split('T')[0])}
                  </span>
                </div>
              </CardHeader>
              {categorizedAppointments.today.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {categorizedAppointments.today.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <CardContent>
                  <EmptyState section="today" />
                </CardContent>
              )}
            </Card>
          )}

          {/* Upcoming Appointments */}
          {activeSection === 'upcoming' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500 rounded-full" />
                  <h2 className="text-lg font-semibold">Próximos Compromissos</h2>
                </div>
              </CardHeader>
              {categorizedAppointments.upcoming.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {categorizedAppointments.upcoming.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              ) : (
                <CardContent>
                  <EmptyState section="upcoming" />
                </CardContent>
              )}
            </Card>
          )}

          {/* Past Appointments */}
          {activeSection === 'past' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-gray-400 rounded-full" />
                  <h2 className="text-lg font-semibold">Compromissos Passados</h2>
                </div>
              </CardHeader>
              {categorizedAppointments.past.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {categorizedAppointments.past.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} isPast />
                  ))}
                </div>
              ) : (
                <CardContent>
                  <EmptyState section="past" />
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Excluir Compromisso</h3>
                <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir este compromisso? Todos os lembretes associados também serão cancelados.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeletingId(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
              >
                Sim, Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
