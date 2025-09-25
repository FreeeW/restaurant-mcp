// TypeScript types and interfaces

export interface Restaurant {
  id: string
  name: string
  phone: string
  email?: string
  cnpj?: string
  address?: string
  settings: {
    timezone: string
    currency: string
    openingTime?: string
    closingTime?: string
    workDays?: string[]
  }
}

export interface Employee {
  id: string
  code: string
  name: string
  hourlyRate: number
  active: boolean
  hoursThisMonth?: number
  phone?: string
  email?: string
  role?: string
}

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
  fileUrl?: string
}

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

export interface User {
  id: string
  email?: string
  phone: string
  restaurantId: string
  role: 'owner' | 'manager' | 'employee'
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: Date
}
