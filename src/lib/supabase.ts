// Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to format phone to E164 (without +)
export const formatPhoneToE164 = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Ensure it starts with 55 (Brazil)
  if (!digits.startsWith('55')) {
    return '55' + digits
  }
  
  // Return only valid lengths (13 digits for Brazil mobile)
  return digits.slice(0, 13)
}

// Helper to format phone for display
export const formatPhoneDisplay = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4)
    const firstPart = digits.slice(4, 9)
    const secondPart = digits.slice(9)
    return `(${ddd}) ${firstPart}-${secondPart}`
  }
  return phone
}
