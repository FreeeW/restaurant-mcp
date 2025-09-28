// Mock data for development and testing
'use client'

// Restaurant data
export const mockRestaurants = [
  {
    id: '1',
    name: 'Restaurante do João',
    phone: '+5511999999999',
    email: 'joao@restaurante.com',
    cnpj: '12.345.678/0001-90',
    address: 'Rua das Flores, 123 - São Paulo, SP'
  }
]

// Employee data
export interface Employee {
  id: string
  code: string
  name: string
  phone?: string
  email?: string
  role?: string
  contractType: 'clt' | 'hourly' | 'daily'
  hourlyRate: number
  monthlySalary?: number
  hoursThisMonth: number
  phoneWhatsApp?: string
  active: boolean
}

export const mockEmployees: Employee[] = [
  {
    id: '1',
    code: 'GAR1',
    name: 'João Silva',
    phone: '(11) 99999-9999',
    email: 'joao@email.com',
    role: 'Garçom',
    contractType: 'hourly',
    hourlyRate: 15.50,
    hoursThisMonth: 160,
    phoneWhatsApp: '+5511999999999',
    active: true
  },
  {
    id: '2',
    code: 'COZ1',
    name: 'Maria Santos',
    phone: '(11) 88888-8888',
    email: 'maria@email.com',
    role: 'Cozinheira',
    contractType: 'clt',
    hourlyRate: 18.00,
    monthlySalary: 2200,
    hoursThisMonth: 180,
    active: true
  },
  {
    id: '3',
    code: 'CAI1',
    name: 'Pedro Costa',
    phone: '(11) 77777-7777',
    role: 'Caixa',
    contractType: 'hourly',
    hourlyRate: 16.00,
    hoursThisMonth: 150,
    active: true
  },
  {
    id: '4',
    code: 'LIM1',
    name: 'Ana Lima',
    phone: '(11) 66666-6666',
    role: 'Limpeza',
    contractType: 'daily',
    hourlyRate: 12.00,
    hoursThisMonth: 120,
    active: false
  }
]

// License data
export interface License {
  id: string
  name: string
  type: 'food' | 'beverage' | 'music' | 'entertainment'
  number: string
  issuer: string
  issueDate: string
  expiryDate: string
  status: 'active' | 'expired' | 'pending'
}

export const mockLicenses: License[] = [
  {
    id: '1',
    name: 'Licença Sanitária',
    type: 'food',
    number: 'LS-2024-001',
    issuer: 'Vigilância Sanitária',
    issueDate: '2024-01-15',
    expiryDate: '2025-01-15',
    status: 'active'
  },
  {
    id: '2',
    name: 'Alvará de Funcionamento',
    type: 'food',
    number: 'AF-2024-002',
    issuer: 'Prefeitura Municipal',
    issueDate: '2024-01-20',
    expiryDate: '2025-01-20',
    status: 'active'
  },
  {
    id: '3',
    name: 'Licença de Música',
    type: 'music',
    number: 'LM-2024-003',
    issuer: 'ECAD',
    issueDate: '2024-02-01',
    expiryDate: '2025-02-01',
    status: 'active'
  }
]

// Supplier data
export interface Supplier {
  id: string
  name: string
  cnpj?: string
  phone?: string
  email?: string
  category: 'food' | 'beverage' | 'cleaning' | 'equipment' | 'other'
  active: boolean
}

export const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Distribuidora de Alimentos Ltda',
    cnpj: '12.345.678/0001-90',
    phone: '(11) 3333-4444',
    email: 'contato@distribuidora.com',
    category: 'food',
    active: true
  },
  {
    id: '2',
    name: 'Bebidas do Brasil',
    cnpj: '98.765.432/0001-10',
    phone: '(11) 2222-3333',
    email: 'vendas@bebidas.com',
    category: 'beverage',
    active: true
  },
  {
    id: '3',
    name: 'Equipamentos Gastronômicos',
    cnpj: '11.222.333/0001-44',
    phone: '(11) 1111-2222',
    email: 'equipamentos@gastro.com',
    category: 'equipment',
    active: true
  },
  {
    id: '4',
    name: 'Produtos de Limpeza Total',
    cnpj: '55.666.777/0001-88',
    phone: '(11) 5555-6666',
    category: 'cleaning',
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

// Daily KPIs - Updated to match API interface
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
    sales: 12500,
    orders: 85,
    averageTicket: 147.06,
    foodCost: 3750,
    foodCostPercentage: 30.0,
    laborCost: 2500,
    laborCostPercentage: 20.0,
    profit: 6250,
    profitMargin: 50.0
  },
  '2025-09-24': {
    date: '2025-09-24',
    sales: 11800,
    orders: 78,
    averageTicket: 151.28,
    foodCost: 3540,
    foodCostPercentage: 30.0,
    laborCost: 2360,
    laborCostPercentage: 20.0,
    profit: 5900,
    profitMargin: 50.0
  },
  '2025-09-23': {
    date: '2025-09-23',
    sales: 13200,
    orders: 92,
    averageTicket: 143.48,
    foodCost: 3960,
    foodCostPercentage: 30.0,
    laborCost: 2640,
    laborCostPercentage: 20.0,
    profit: 6600,
    profitMargin: 50.0
  },
  '2025-09-22': {
    date: '2025-09-22',
    sales: 9800,
    orders: 65,
    averageTicket: 150.77,
    foodCost: 2940,
    foodCostPercentage: 30.0,
    laborCost: 1960,
    laborCostPercentage: 20.0,
    profit: 4900,
    profitMargin: 50.0
  },
  '2025-09-21': {
    date: '2025-09-21',
    sales: 15200,
    orders: 105,
    averageTicket: 144.76,
    foodCost: 4560,
    foodCostPercentage: 30.0,
    laborCost: 3040,
    laborCostPercentage: 20.0,
    profit: 7600,
    profitMargin: 50.0
  }
}

// Generate daily hours for a specific date
export function generateDailyHours(date: Date): any {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const randomFactor = Math.random() * 2 - 1 // -1 to 1
  
  const employees = [
    { 
      id: '1',
      code: 'GAR1', 
      name: 'João Silva', 
      hours: isWeekend ? 9 : 8 + randomFactor,
      total: (isWeekend ? 9 : 8 + randomFactor) * 15.50
    },
    { 
      id: '2',
      code: 'COZ1', 
      name: 'Maria Santos', 
      hours: isWeekend ? 10 : 9 + randomFactor,
      total: (isWeekend ? 10 : 9 + randomFactor) * 18.00
    },
    { 
      id: '3',
      code: 'CAI1', 
      name: 'Pedro Costa', 
      hours: isWeekend ? 8 : 7 + randomFactor,
      total: (isWeekend ? 8 : 7 + randomFactor) * 16.00
    }
  ]
  
  return {
    date: date.toISOString().split('T')[0],
    employees: employees.filter(e => e.hours > 0),
    totalHours: employees.reduce((sum, e) => sum + e.hours, 0),
    totalCost: employees.reduce((sum, e) => sum + e.total, 0)
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
    minStock: 10,
    maxStock: 100,
    cost: 4.50
  },
  {
    id: '2',
    name: 'Feijão',
    category: 'Grãos',
    unit: 'kg',
    currentStock: 30,
    minStock: 5,
    maxStock: 50,
    cost: 6.80
  },
  {
    id: '3',
    name: 'Carne Bovina',
    category: 'Proteínas',
    unit: 'kg',
    currentStock: 25,
    minStock: 8,
    maxStock: 40,
    cost: 28.90
  },
  {
    id: '4',
    name: 'Frango',
    category: 'Proteínas',
    unit: 'kg',
    currentStock: 20,
    minStock: 5,
    maxStock: 30,
    cost: 12.50
  },
  {
    id: '5',
    name: 'Tomate',
    category: 'Vegetais',
    unit: 'kg',
    currentStock: 15,
    minStock: 3,
    maxStock: 25,
    cost: 3.20
  }
]