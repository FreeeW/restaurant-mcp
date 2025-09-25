// Mock data for development
export const mockRestaurant = {
  id: 'mock-123',
  name: 'Restaurante Demo',
  phone: '5511999999999',
  email: 'demo@restaurant.com',
  cnpj: '12.345.678/0001-90',
  address: 'Rua Exemplo, 123 - São Paulo, SP',
  settings: {
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    openingTime: '11:00',
    closingTime: '22:00',
    workDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  }
}

export interface Employee {
  id: string
  code: string
  name: string
  hourlyRate: number
  active: boolean
  hoursThisMonth: number
  phone?: string
  email?: string
  role?: string
}

export const mockEmployees: Employee[] = [
  {
    id: '1',
    code: 'GAR1',
    name: 'João Silva',
    hourlyRate: 15.50,
    active: true,
    hoursThisMonth: 168,
    role: 'Garçom'
  },
  {
    id: '2', 
    code: 'COZ1',
    name: 'Maria Santos',
    hourlyRate: 18.00,
    active: true,
    hoursThisMonth: 176,
    role: 'Cozinheira'
  },
  {
    id: '3',
    code: 'GAR2',
    name: 'Pedro Oliveira',
    hourlyRate: 15.50,
    active: true,
    hoursThisMonth: 120,
    role: 'Garçom'
  },
  {
    id: '4',
    code: 'AUX1',
    name: 'Ana Costa',
    hourlyRate: 12.00,
    active: true,
    hoursThisMonth: 160,
    role: 'Auxiliar'
  },
  {
    id: '5',
    code: 'COZ2',
    name: 'Carlos Ferreira',
    hourlyRate: 20.00,
    active: true,
    hoursThisMonth: 168,
    role: 'Chef'
  },
  {
    id: '6',
    code: 'CAI1',
    name: 'Juliana Lima',
    hourlyRate: 14.00,
    active: true,
    hoursThisMonth: 176,
    role: 'Caixa'
  },
  {
    id: '7',
    code: 'LIM1',
    name: 'Roberto Souza',
    hourlyRate: 12.00,
    active: false,
    hoursThisMonth: 0,
    role: 'Limpeza'
  },
  {
    id: '8',
    code: 'GAR3',
    name: 'Fernanda Alves',
    hourlyRate: 15.50,
    active: true,
    hoursThisMonth: 140,
    role: 'Garçom'
  }
]

export interface DailyKPI {
  date: string
  sales: number
  foodCost: number
  labourCost: number
  foodPercent: number
  labourPercent: number
  orders?: number
  averageTicket?: number
}

// Generate mock daily KPIs for the current month
const generateDailyKPIs = (): Record<string, DailyKPI> => {
  const kpis: Record<string, DailyKPI> = {}
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  for (let day = 1; day <= 31; day++) {
    const date = new Date(currentYear, currentMonth, day)
    if (date.getMonth() !== currentMonth) break
    
    const dateStr = date.toISOString().split('T')[0]
    const baseSales = 2500 + Math.random() * 2000
    const foodCost = baseSales * (0.28 + Math.random() * 0.07)
    const labourCost = baseSales * (0.13 + Math.random() * 0.05)
    
    kpis[dateStr] = {
      date: dateStr,
      sales: Math.round(baseSales),
      foodCost: Math.round(foodCost),
      labourCost: Math.round(labourCost),
      foodPercent: Math.round((foodCost / baseSales) * 100),
      labourPercent: Math.round((labourCost / baseSales) * 100),
      orders: Math.floor(20 + Math.random() * 30),
      averageTicket: Math.round(baseSales / (20 + Math.random() * 30))
    }
  }
  
  return kpis
}

export const mockDailyKPIs = generateDailyKPIs()

export interface Supplier {
  id: string
  name: string
  cnpj?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  invoices: Invoice[]
}

export interface Invoice {
  id: string
  number: string
  date: string
  dueDate?: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  notes?: string
}

export const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Distribuidora ABC',
    cnpj: '12.345.678/0001-90',
    contact: 'Carlos Silva',
    phone: '(11) 3333-4444',
    email: 'vendas@abc.com.br',
    notes: 'Entrega às terças e quintas. Pedido mínimo R$ 500',
    invoices: [
      {
        id: 'inv1',
        number: 'NF-2024-001',
        date: '2024-01-10',
        dueDate: '2024-01-25',
        amount: 2500.00,
        status: 'paid'
      },
      {
        id: 'inv2',
        number: 'NF-2024-015',
        date: '2024-01-15',
        dueDate: '2024-01-30',
        amount: 1800.00,
        status: 'pending'
      }
    ]
  },
  {
    id: '2',
    name: 'Açougue Premium',
    cnpj: '98.765.432/0001-10',
    contact: 'João Martins',
    phone: '(11) 2222-3333',
    email: 'pedidos@acouguepremium.com',
    notes: 'Melhor qualidade de carnes. Entrega diária',
    invoices: [
      {
        id: 'inv3',
        number: 'NF-2024-100',
        date: '2024-01-12',
        dueDate: '2024-01-27',
        amount: 3200.00,
        status: 'paid'
      }
    ]
  },
  {
    id: '3',
    name: 'Hortifruti Verde Vida',
    cnpj: '45.678.912/0001-23',
    contact: 'Maria Oliveira',
    phone: '(11) 4444-5555',
    notes: 'Produtos orgânicos disponíveis sob encomenda',
    invoices: [
      {
        id: 'inv4',
        number: 'NF-2024-050',
        date: '2024-01-08',
        amount: 850.00,
        status: 'overdue'
      }
    ]
  },
  {
    id: '4',
    name: 'Bebidas Express',
    cnpj: '78.912.345/0001-56',
    contact: 'Roberto Costa',
    phone: '(11) 5555-6666',
    email: 'vendas@bebidasexpress.com',
    invoices: []
  },
  {
    id: '5',
    name: 'Padaria Artesanal',
    contact: 'Ana Paula',
    phone: '(11) 6666-7777',
    notes: 'Pães frescos diariamente às 6h',
    invoices: [
      {
        id: 'inv5',
        number: 'NF-2024-200',
        date: '2024-01-18',
        amount: 420.00,
        status: 'pending'
      }
    ]
  }
]

export interface DailyHours {
  date: string
  employees: {
    id: string
    code: string
    name: string
    hours: number
    hourlyRate: number
    total: number
  }[]
  totalHours: number
  totalCost: number
}

// Fixed Costs Mock Data
export interface FixedCost {
  id: string
  name: string
  amount: number
  frequency: 'monthly' | 'annual'
  category: string
  dueDay?: number  // For monthly costs
  dueMonth?: string  // For annual costs
  active: boolean
}

export const mockFixedCosts: FixedCost[] = [
  {
    id: '1',
    name: 'Aluguel',
    amount: 8500,
    frequency: 'monthly',
    category: 'Aluguel',
    dueDay: 5,
    active: true
  },
  {
    id: '2',
    name: 'Energia Elétrica',
    amount: 2200,
    frequency: 'monthly',
    category: 'Utilidades',
    dueDay: 15,
    active: true
  },
  {
    id: '3',
    name: 'Água e Esgoto',
    amount: 850,
    frequency: 'monthly',
    category: 'Utilidades',
    dueDay: 10,
    active: true
  },
  {
    id: '4',
    name: 'Internet/Telefone',
    amount: 450,
    frequency: 'monthly',
    category: 'Utilidades',
    dueDay: 20,
    active: true
  },
  {
    id: '5',
    name: 'IPTU',
    amount: 12000,
    frequency: 'annual',
    category: 'Impostos',
    dueMonth: 'Janeiro',
    active: true
  },
  {
    id: '6',
    name: 'Seguro do Estabelecimento',
    amount: 4800,
    frequency: 'annual',
    category: 'Seguros',
    dueMonth: 'Março',
    active: true
  },
  {
    id: '7',
    name: 'Sistema de Gestão',
    amount: 299,
    frequency: 'monthly',
    category: 'Operacional',
    dueDay: 1,
    active: true
  },
  {
    id: '8',
    name: 'Marketing Digital',
    amount: 800,
    frequency: 'monthly',
    category: 'Marketing',
    dueDay: 5,
    active: true
  }
]

// Appointments Mock Data
export interface Appointment {
  id: string
  title: string
  date: string
  time: string
  type: 'delivery' | 'maintenance' | 'meeting' | 'inspection' | 'event' | 'other'
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  person?: string
  location?: string
  notes?: string
}

export const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Entrega de Carnes - Açougue Premium',
    date: new Date().toISOString().split('T')[0],
    time: '06:30',
    type: 'delivery',
    status: 'confirmed',
    person: 'João - Açougue Premium',
    location: 'Recepção de mercadorias'
  },
  {
    id: '2',
    title: 'Manutenção Ar Condicionado',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    type: 'maintenance',
    status: 'confirmed',
    person: 'TechAr Climatização',
    notes: 'Manutenção preventiva mensal'
  },
  {
    id: '3',
    title: 'Reunião com Fornecedor de Bebidas',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '10:00',
    type: 'meeting',
    status: 'pending',
    person: 'Carlos - Bebidas Express',
    location: 'Escritório'
  },
  {
    id: '4',
    title: 'Inspeção Vigilância Sanitária',
    date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // Next week
    time: '09:00',
    type: 'inspection',
    status: 'confirmed',
    person: 'Vigilância Sanitária Municipal',
    notes: 'Inspeção de rotina anual'
  },
  {
    id: '5',
    title: 'Evento - Aniversário de 5 anos',
    date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], // Next month
    time: '19:00',
    type: 'event',
    status: 'confirmed',
    location: 'Salão Principal',
    notes: 'Preparar decoração especial e menu comemorativo'
  },
  {
    id: '6',
    title: 'Entrega de Hortifruti',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    time: '07:00',
    type: 'delivery',
    status: 'completed',
    person: 'Hortifruti Verde Vida'
  },
  {
    id: '7',
    title: 'Treinamento Equipe - Novos Pratos',
    date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], // In 3 days
    time: '15:00',
    type: 'meeting',
    status: 'confirmed',
    person: 'Chef Carlos',
    location: 'Cozinha',
    notes: 'Apresentação do novo cardápio de verão'
  },
  {
    id: '8',
    title: 'Dedetização',
    date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], // In 15 days
    time: '22:00',
    type: 'maintenance',
    status: 'pending',
    person: 'CleanPest Controle de Pragas',
    notes: 'Realizar após fechamento do restaurante'
  }
]

export const generateDailyHours = (date: Date): DailyHours => {
  const dateStr = date.toISOString().split('T')[0]
  const dayOfWeek = date.getDay()
  
  // Different staffing for weekends
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const activeEmployees = mockEmployees.filter(e => e.active)
  
  // Random selection of employees working that day
  const workingToday = activeEmployees.filter(() => Math.random() > 0.3)
  
  const employees = workingToday.map(emp => {
    const hours = isWeekend ? 8 + Math.random() * 4 : 6 + Math.random() * 4
    return {
      id: emp.id,
      code: emp.code,
      name: emp.name,
      hours: Math.round(hours * 10) / 10,
      hourlyRate: emp.hourlyRate,
      total: Math.round(hours * emp.hourlyRate * 100) / 100
    }
  })
  
  const totalHours = employees.reduce((sum, e) => sum + e.hours, 0)
  const totalCost = employees.reduce((sum, e) => sum + e.total, 0)
  
  return {
    date: dateStr,
    employees,
    totalHours: Math.round(totalHours * 10) / 10,
    totalCost: Math.round(totalCost * 100) / 100
  }
}
