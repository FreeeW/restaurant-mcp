// Layout for authenticated pages with sidebar
'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
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
  )
}
