// Sidebar component
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard,
  Users,
  Package,
  Clock,
  Settings,
  ChefHat,
  LogOut,
  ChevronDown,
  Calculator,
  CalendarCheck
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Funcionários', href: '/employees', icon: Users },
  { name: 'Fornecedores', href: '/suppliers', icon: Package },
  { name: 'Horas', href: '/hours', icon: Clock },
  { name: 'Custos Fixos', href: '/fixed-costs', icon: Calculator },
  { name: 'Compromissos', href: '/appointments', icon: CalendarCheck },
  { name: 'Configurações', href: '/settings', icon: Settings },
]

interface SidebarProps {
  className?: string
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  return (
    <aside className={`w-full lg:w-[280px] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto bg-white border-r border-gray-200 ${className}`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <ChefHat className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900">RestaurantOS</h1>
            <p className="text-xs text-gray-600">Sistema de Gestão</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-600 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
        
        {/* User Menu */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">RD</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Restaurante Demo</p>
                <p className="text-xs text-gray-600">Trial - 14 dias</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {userMenuOpen && (
            <div className="mt-2 py-2 bg-white rounded-lg border border-gray-200">
              <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
