// Appointments page
'use client'

import { useState } from 'react'
import { Plus, Calendar, Clock, MapPin, User, AlertCircle, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { mockAppointments } from '@/lib/mock-data'

export default function AppointmentsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<any>(null)
  const [appointments, setAppointments] = useState(mockAppointments)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  
  // Filtrar compromissos por status
  const todayAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.date)
    const today = new Date()
    return appointmentDate.toDateString() === today.toDateString()
  })
  
  const upcomingAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.date)
    const today = new Date()
    return appointmentDate > today
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const pastAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.date)
    const today = new Date()
    return appointmentDate < today && appointmentDate.toDateString() !== today.toDateString()
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  const formatTime = (time: string) => {
    return time.substring(0, 5) // Remove seconds if present
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado'
      case 'pending': return 'Pendente'
      case 'cancelled': return 'Cancelado'
      case 'completed': return 'Concluído'
      default: return status
    }
  }
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery': return '📦'
      case 'maintenance': return '🔧'
      case 'meeting': return '🤝'
      case 'inspection': return '🔍'
      case 'event': return '🎉'
      default: return '📅'
    }
  }
  
  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este compromisso?')) {
      setAppointments(appointments.filter(a => a.id !== id))
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compromissos</h1>
          <p className="text-gray-600">Gerencie os compromissos e eventos do restaurante</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendário
            </button>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Compromisso
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Hoje</p>
              <p className="text-2xl font-bold">{todayAppointments.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Próximos</p>
              <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold">
                {appointments.filter(a => a.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{appointments.length}</p>
            </div>
          </div>
        </Card>
      </div>
      
      {viewMode === 'list' ? (
        /* List View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Appointments */}
          <Card>
            <CardHeader className="bg-blue-50">
              <h2 className="text-lg font-semibold text-blue-900">Hoje</h2>
            </CardHeader>
            <CardContent className="p-4">
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum compromisso hoje
                </p>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getTypeIcon(appointment.type)}</span>
                          <div>
                            <p className="font-medium text-gray-900">{appointment.title}</p>
                            <p className="text-sm text-gray-600">{formatTime(appointment.time)}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                      {appointment.person && (
                        <p className="text-sm text-gray-600 mb-1">
                          <User className="w-3 h-3 inline mr-1" />
                          {appointment.person}
                        </p>
                      )}
                      {appointment.location && (
                        <p className="text-sm text-gray-600">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {appointment.location}
                        </p>
                      )}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => {
                            setEditingAppointment(appointment)
                            setShowForm(true)
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(appointment.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="bg-green-50">
              <h2 className="text-lg font-semibold text-green-900">Próximos</h2>
            </CardHeader>
            <CardContent className="p-4 max-h-[500px] overflow-y-auto">
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum compromisso futuro
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getTypeIcon(appointment.type)}</span>
                          <div>
                            <p className="font-medium text-gray-900">{appointment.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(appointment.date).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-sm text-gray-600">{formatTime(appointment.time)}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                      {appointment.person && (
                        <p className="text-sm text-gray-600">
                          <User className="w-3 h-3 inline mr-1" />
                          {appointment.person}
                        </p>
                      )}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => {
                            setEditingAppointment(appointment)
                            setShowForm(true)
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(appointment.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Past Appointments */}
          <Card>
            <CardHeader className="bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-700">Anteriores</h2>
            </CardHeader>
            <CardContent className="p-4 max-h-[500px] overflow-y-auto">
              {pastAppointments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum compromisso anterior
                </p>
              ) : (
                <div className="space-y-3">
                  {pastAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="p-3 bg-gray-50 border rounded-lg opacity-75">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getTypeIcon(appointment.type)}</span>
                          <div>
                            <p className="font-medium text-gray-700">{appointment.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(appointment.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Calendar View */
        <Card className="p-6">
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Visualização de calendário em desenvolvimento</p>
            <p className="text-sm mt-2">Use a visualização em lista por enquanto</p>
          </div>
        </Card>
      )}
      
      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <h2 className="text-lg font-semibold">
                {editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}
              </h2>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault()
                // Handle form submission
                setShowForm(false)
                setEditingAppointment(null)
              }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <Input
                    defaultValue={editingAppointment?.title}
                    placeholder="Ex: Reunião com fornecedor"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data
                    </label>
                    <Input
                      type="date"
                      defaultValue={editingAppointment?.date}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horário
                    </label>
                    <Input
                      type="time"
                      defaultValue={editingAppointment?.time}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    defaultValue={editingAppointment?.type || 'meeting'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="delivery">Entrega</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="meeting">Reunião</option>
                    <option value="inspection">Inspeção</option>
                    <option value="event">Evento</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pessoa/Empresa
                  </label>
                  <Input
                    defaultValue={editingAppointment?.person}
                    placeholder="Nome da pessoa ou empresa"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Local
                  </label>
                  <Input
                    defaultValue={editingAppointment?.location}
                    placeholder="Endereço ou local do compromisso"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    defaultValue={editingAppointment?.status || 'pending'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pending">Pendente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    defaultValue={editingAppointment?.notes}
                    placeholder="Anotações adicionais..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false)
                      setEditingAppointment(null)
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1">
                    {editingAppointment ? 'Salvar' : 'Adicionar'}
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
