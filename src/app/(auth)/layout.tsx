// Layout for authenticated pages with sidebar
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { AuthProvider } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const authenticated = localStorage.getItem('authenticated')
      const ownerId = localStorage.getItem('owner_id')
      
      if (authenticated === 'true' && ownerId) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (isAuthenticated === null) {
    // Loading state while checking authentication
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return <>{children}</>
}

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AuthProvider>
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          {/* Grid layout: sidebar left, content right */}
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-0">
            {/* Desktop Sidebar - Left Side */}
            <Sidebar className="hidden lg:block" />
            
            {/* Main Content Area */}
            <div className="min-w-0">
              <Header onMenuClick={() => setSidebarOpen(true)} />
              
              <main className="p-4 lg:p-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
            
            {/* Mobile Navigation Drawer */}
            <MobileNav 
              open={sidebarOpen} 
              onOpenChange={setSidebarOpen} 
            />
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  )
}
