// Login page
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, Phone, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }
  
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Mock API call
    setTimeout(() => {
      setLoading(false)
      setStep('code')
    }, 1000)
  }
  
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Mock API call
    setTimeout(() => {
      setLoading(false)
      // Redirect to dashboard
      router.push('/dashboard')
    }, 1000)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <ChefHat className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">RestaurantOS</h1>
          <p className="text-gray-600 mt-2">
            {step === 'phone' 
              ? 'Entre com seu WhatsApp' 
              : 'Digite o código enviado'}
          </p>
        </div>
        
        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                'Enviando...'
              ) : (
                <>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Verificação
              </label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-sm text-gray-600 mt-2">
                Enviamos um código para {phone}
              </p>
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                'Verificando...'
              ) : (
                'Entrar'
              )}
            </Button>
            
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              Usar outro número
            </button>
          </form>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            Não tem uma conta?{' '}
            <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Fale conosco
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}
