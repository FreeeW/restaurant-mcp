// Mock data for development
export const mockRestaurant = {
  id: 'mock-123',
  name: 'Restaurante Demo',
  phone: '5511999999999',
  email: 'demo@restaurant.com',
  cnpj: '12.345.678/0001-90',
  address: 'Rua Exemplo, 123 - São Paulo, SP',
  managerPhone: '5511999998888', // Manager WhatsApp for daily sales reminders
  closingTime: '21:30', // Time to send daily reminder
  closingReminderEnabled: true,
  employeeCheckMode: 'both' as 'form' | 'whatsapp' | 'both', // How employees register time
  employeeReminderEnabled: false,
  employeeReminderTime: '07:30',
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
  phoneWhatsApp?: string // WhatsApp for time tracking
  email?: string
  role?: string
  contractType?: 'hourly' | 'clt' | 'daily'
  monthlySalary?: number
}

export const mockEmployees: Employee[] = [
  {
    id: '1',
    code: 'GAR1',
    name: 'João Silva',
    hourlyRate: 15.50,
    active: true,
    hoursThisMonth: 168,
    role: 'Garçom',
    phoneWhatsApp: '5511999991111',
    contractType: 'hourly'
  },
  {
    id: '2', 
    code: 'COZ1',
    name: 'Maria Santos',
    hourlyRate: 18.00,
    active: true,
    hoursThisMonth: 176,
    role: 'Cozinheira',
    phoneWhatsApp: '5511999992222',
    contractType: 'clt',
    monthlySalary: 3200
  },
  {
    id: '3',
    code: 'GAR2',
    name: 'Pedro Oliveira',
    hourlyRate: 15.50,
    active: true,
    hoursThisMonth: 120,
    role: 'Garçom',
    contractType: 'hourly'
  },
  {
    id: '4',
    code: 'AUX1',
    name: 'Ana Costa',
    hourlyRate: 12.00,
    active: true,
    hoursThisMonth: 160,
    role: 'Auxiliar',
    contractType: 'hourly'
  },
  {
    id: '5',
    code: 'COZ2',
    name: 'Carlos Ferreira',
    hourlyRate: 20.00,
    active: true,
    hoursThisMonth: 168,
    role: 'Chef',
    phoneWhatsApp: '5511999995555',
    contractType: 'clt',
    monthlySalary: 4500
  },
  {
    id: '6',
    code: 'CAI1',
    name: 'Juliana Lima',
    hourlyRate: 14.00,
    active: true,
    hoursThisMonth: 176,
    role: 'Caixa',
    contractType: 'hourly'
  },
  {
    id: '7',
    code: 'LIM1',
    name: 'Roberto Souza',
    hourlyRate: 12.00,
    active: false,
    hoursThisMonth: 0,
    role: 'Limpeza',
    contractType: 'daily'
  },
  {
    id: '8',
    code: 'GAR3',
    name: 'Fernanda Alves',
    hourlyRate: 15.50,
    active: true,
    hoursThisMonth: 140,
    role: 'Garçom',
    contractType: 'hourly'
  }
]

export interface Appointment {
  id: string
  title: string
  date: string
  time?: string
  category: 'maintenance' | 'delivery' | 'meeting' | 'inspection' | 'other'
  notes?: string
  completed: boolean
}

export const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Manutenção do Ar Condicionado',
    date: '2024-01-15',
    time: '14:00',
    category: 'maintenance',
    notes: 'Verificação mensal',
    completed: false
  },
  {
    id: '2',
    title: 'Entrega de Verduras',
    date: '2024-01-12',
    time: '08:00',
    category: 'delivery',
    notes: 'Fornecedor: Hortifruti Central',
    completed: false
  },
  {
    id: '3',
    title: 'Reunião com Fornecedores',
    date: '2024-01-18',
    time: '16:00',
    category: 'meeting',
    notes: 'Negociar preços para 2024',
    completed: false
  },
  {
    id: '4',
    title: 'Vistoria Vigilância Sanitária',
    date: '2024-01-20',
    category: 'inspection',
    notes: 'Preparar documentação',
    completed: false
  }
]

export interface License {
  id: string
  title: string
  number?: string
  issuingAuthority?: string
  issueDate?: string
  expiryDate: string
  category: 'sanitario' | 'bombeiros' | 'funcionamento' | 'ambiental' | 'outros'
  status: 'valid' | 'expiring' | 'expired'
  notes?: string
}

export const mockLicenses: License[] = [
  {
    id: '1',
    title: 'Alvará de Funcionamento',
    number: 'AF2023/45678',
    issuingAuthority: 'Prefeitura Municipal',
    issueDate: '2023-01-15',
    expiryDate: '2024-01-15',
    category: 'funcionamento',
    status: 'expiring',
    notes: 'Renovar até 30 dias antes do vencimento'
  },
  {
    id: '2',
    title: 'AVCB - Bombeiros',
    number: 'AVCB/2023/12345',
    issuingAuthority: 'Corpo de Bombeiros',
    issueDate: '2023-06-01',
    expiryDate: '2024-06-01',
    category: 'bombeiros',
    status: 'valid'
  },
  {
    id: '3',
    title: 'Licença Sanitária',
    number: 'LS/2023/98765',
    issuingAuthority: 'Vigilância Sanitária',
    issueDate: '2023-03-20',
    expiryDate: '2024-03-20',
    category: 'sanitario',
    status: 'valid'
  },
  {
    id: '4',
    title: 'Licença Ambiental',
    number: 'LA/2023/55555',
    issuingAuthority: 'CETESB',
    issueDate: '2023-08-10',
    expiryDate: '2025-08-10',
    category: 'ambiental',
    status: 'valid'
  }
]

// Suppliers
export interface Supplier {
  id: string
  name: string
  cnpj?: string
  category: 'food' | 'beverages' | 'cleaning' | 'equipment' | 'services' | 'other'
  phone?: string
  email?: string
  contact?: string
  active: boolean
}

export const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Hortifruti Central',
    cnpj: '12.345.678/0001-90',
    category: 'food',
    phone: '(11) 3333-4444',
    email: 'vendas@hortifruti.com',
    contact: 'João',
    active: true
  },
  {
    id: '2',
    name: 'Bebidas Express',
    cnpj: '98.765.432/0001-10',
    category: 'beverages',
    phone: '(11) 2222-3333',
    email: 'pedidos@bebidas.com',
    contact: 'Maria',
    active: true
  },
  {
    id: '3',
    name: 'Carnes Premium',
    cnpj: '45.678.901/0001-23',
    category: 'food',
    phone: '(11) 4444-5555',
    email: 'vendas@carnespremium.com',
    contact: 'Pedro',
    active: true
  },
  {
    id: '4',
    name: 'Limpeza Total',
    cnpj: '56.789.012/0001-34',
    category: 'cleaning',
    phone: '(11) 5555-6666',
    active: false
  }
]

// Fixed Costs
export interface FixedCost {
  id: string
  name: string
  category: 'rent' | 'utilities' | 'insurance' | 'tax' | 'salary' | 'other'
  amount: number
  frequency: 'monthly' | 'quarterly' | 'annual'
  dueDay?: number
  active: boolean
}

export const mockFixedCosts: FixedCost[] = [
  {
    id: '1',
    name: 'Aluguel',
    category: 'rent',
    amount: 8500,
    frequency: 'monthly',
    dueDay: 5,
    active: true
  },
  {
    id: '2',
    name: 'Energia Elétrica',
    category: 'utilities',
    amount: 2200,
    frequency: 'monthly',
    dueDay: 10,
    active: true
  },
  {
    id: '3',
    name: 'Água',
    category: 'utilities',
    amount: 800,
    frequency: 'monthly',
    dueDay: 10,
    active: true
  },
  {
    id: '4',
    name: 'Internet/Telefone',
    category: 'utilities',
    amount: 350,
    frequency: 'monthly',
    dueDay: 15,
    active: true
  },
  {
    id: '5',
    name: 'Seguro',
    category: 'insurance',
    amount: 1200,
    frequency: 'monthly',
    active: true
  },
  {
    id: '6',
    name: 'IPTU',
    category: 'tax',
    amount: 12000,
    frequency: 'annual',
    active: true
  }
]

// Daily KPIs
export interface DailyKPI {
  date: string
  sales: number
  orders: number
  averageTicket: number
  foodCost: number
  foodCostPercentage: number
  laborCost: number
  laborCostPercentage: number
  profit: number
  profitMargin: number
}

export const mockDailyKPIs: Record<string, DailyKPI> = {
  '2025-09-25': {
    date: '2025-09-25',
    sales: 4850.00,
    orders: 42,
    averageTicket: 115.48,
    foodCost: 1455.00,
    foodCostPercentage: 30.0,
    laborCost: 970.00,
    laborCostPercentage: 20.0,
    profit: 2425.00,
    profitMargin: 50.0
  },
  '2025-09-24': {
    date: '2025-09-24',
    sales: 5200.00,
    orders: 48,
    averageTicket: 108.33,
    foodCost: 1560.00,
    foodCostPercentage: 30.0,
    laborCost: 1040.00,
    laborCostPercentage: 20.0,
    profit: 2600.00,
    profitMargin: 50.0
  },
  '2025-09-23': {
    date: '2025-09-23',
    sales: 3900.00,
    orders: 35,
    averageTicket: 111.43,
    foodCost: 1170.00,
    foodCostPercentage: 30.0,
    laborCost: 780.00,
    laborCostPercentage: 20.0,
    profit: 1950.00,
    profitMargin: 50.0
  }
}

// Generate daily hours for calendar
export function generateDailyHours(date: Date): any {
  const dateStr = date.toISOString().split('T')[0]
  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  
  // Generate random but consistent data based on date
  const seed = date.getDate() + date.getMonth() * 100
  const randomFactor = (seed % 10) / 10
  
  const baseHours = isWeekend ? 12 : 10
  const totalHours = baseHours + randomFactor * 4
  const totalCost = totalHours * 60 // Average R$15/hour * 4 employees
  
  const employees = [
    { code: 'GAR1', name: 'João Silva', hours: isWeekend ? 9 : 8 + randomFactor },
    { code: 'COZ1', name: 'Maria Santos', hours: isWeekend ? 10 : 8.5 + randomFactor },
    { code: 'GAR2', name: 'Pedro Oliveira', hours: isWeekend ? 8 : 7 + randomFactor },
    { code: 'AUX1', name: 'Ana Costa', hours: isWeekend ? 9 : 8 + randomFactor }
  ]
  
  return {
    date: dateStr,
    totalHours: Math.round(totalHours * 10) / 10,
    totalCost: Math.round(totalCost),
    employees: employees.filter(e => e.hours > 0)
  }
}

// Products/Items for inventory
export interface Product {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  minStock: number
  maxStock: number
  cost: number
}

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Arroz',
    category: 'Grãos',
    unit: 'kg',
    currentStock: 50,
    minStock: 20,
    maxStock: 100,
    cost: 4.50
  },
  {
    id: '2',
    name: 'Feijão',
    category: 'Grãos',
    unit: 'kg',
    currentStock: 30,
    minStock: 15,
    maxStock: 60,
    cost: 7.00
  },
  {
    id: '3',
    name: 'Óleo',
    category: 'Óleos',
    unit: 'litro',
    currentStock: 20,
    minStock: 10,
    maxStock: 40,
    cost: 8.50
  },
  {
    id: '4',
    name: 'Tomate',
    category: 'Verduras',
    unit: 'kg',
    currentStock: 15,
    minStock: 10,
    maxStock: 30,
    cost: 5.00
  }
]
