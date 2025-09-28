// Authentication Context
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Owner {
  id: string
  phone_e164: string
  business_name: string
  email?: string
  manager_phone_e164?: string
  closing_time?: string
  closing_reminder_enabled?: boolean
  employee_check_mode?: string
  employee_reminder_time?: string
  employee_reminder_enabled?: boolean
  subscription_status?: string
}

interface AuthContextType {
  owner: Owner | null
  loading: boolean
  login: (phone: string, code: string) => Promise<boolean>
  logout: () => void
  sendCode: (phone: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Check if already logged in on mount
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const storedOwnerId = localStorage.getItem('owner_id')
      const authenticated = localStorage.getItem('authenticated')
      
      if (storedOwnerId && authenticated === 'true') {
        // Fetch owner data from database
        const { data, error } = await supabase
          .from('owners')
          .select('*')
          .eq('id', storedOwnerId)
          .single()
        
        if (data && !error) {
          setOwner(data)
        } else {
          // Invalid session, clear it
          localStorage.removeItem('owner_id')
          localStorage.removeItem('authenticated')
        }
      }
    } catch (error) {
      console.error('Error checking session:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendCode = async (phone: string): Promise<boolean> => {
    try {
      // Check if phone exists in owners table
      const { data, error } = await supabase
        .from('owners')
        .select('id, business_name')
        .eq('phone_e164', phone)
        .single()
      
      if (data && !error) {
        // Store pending login
        localStorage.setItem('pending_owner_id', data.id)
        localStorage.setItem('pending_phone', phone)
        
        // In production, you would send a real WhatsApp/SMS code here
        // For now, we'll use a mock code: 123456
        console.log('Mock code sent: 123456')
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error sending code:', error)
      return false
    }
  }

  const login = async (phone: string, code: string): Promise<boolean> => {
    try {
      // In production, verify the real code here
      // For MVP, we'll accept "123456" as valid
      if (code !== '123456') {
        return false
      }
      
      // Fetch owner data
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('phone_e164', phone)
        .single()
      
      if (data && !error) {
        // Store session
        localStorage.setItem('owner_id', data.id)
        localStorage.setItem('authenticated', 'true')
        localStorage.setItem('owner_phone', phone)
        localStorage.setItem('business_name', data.business_name)
        
        // Clean up pending data
        localStorage.removeItem('pending_owner_id')
        localStorage.removeItem('pending_phone')
        
        setOwner(data)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error logging in:', error)
      return false
    }
  }

  const logout = () => {
    // Clear all session data
    localStorage.removeItem('owner_id')
    localStorage.removeItem('authenticated')
    localStorage.removeItem('owner_phone')
    localStorage.removeItem('business_name')
    
    setOwner(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{
      owner,
      loading,
      login,
      logout,
      sendCode
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}