// Mobile Navigation component
'use client'

import { X } from 'lucide-react'
import Sidebar from './Sidebar'

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function MobileNav({ open, onOpenChange }: MobileNavProps) {
  if (!open) return null
  
  return (
    <div className="lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Sidebar Drawer - slides from left */}
      <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-xl">
        <div className="relative h-full">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
          <Sidebar className="!border-r-0" />
        </div>
      </div>
    </div>
  )
}
