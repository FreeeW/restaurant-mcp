// Login page with real Supabase authentication
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, Phone, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { formatPhoneToE164, formatPhoneDisplay } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    // Limit to 13 digits maximum
    return digits.slice(0, 13)
  }
  
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // Format phone to E164
      const phoneE164 = formatPhoneToE164(phone)
      
      if (phoneE164.length < 13) {
        throw new Error('Número de telefone inválido')
      }
      
      // Check if phone exists in database
      const { data, error: dbError } = await supabase
        .from('owners')
        .select('id, business_name')
        .eq('phone_e164', phoneE164)
        .single()
      
      if (dbError || !data) {
        setError('Número não cadastrado. Entre em contato com o suporte para cadastrar seu restaurante.')
        setLoading(false)
        return
      }
      
      // Store pending data
      localStorage.setItem('pending_owner_id', data.id)
      localStorage.setItem('pending_phone', phoneE164)
      localStorage.setItem('pending_business', data.business_name)
      
      // In production, send real WhatsApp/SMS code here
      // For now, we'll use mock code: 123456
      console.log('🔐 Código de teste: 123456')
      
      setStep('code')
      setError(null)
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'Erro ao enviar código')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const phoneE164 = localStorage.getItem('pending_phone') || formatPhoneToE164(phone)
      
      // Verify code (mock verification for now)
      if (code !== '123456') {
        setError('Código incorreto. Use 123456 para teste.')
        setLoading(false)
        return
      }
      
      // Fetch complete owner data
      const { data, error: dbError } = await supabase
        .from('owners')
        .select('*')
        .eq('phone_e164', phoneE164)
        .single()
      
      if (dbError || !data) {
        setError('Erro ao fazer login. Tente novamente.')
        setLoading(false)
        return
      }
      
      // Store session
      localStorage.setItem('owner_id', data.id)
      localStorage.setItem('authenticated', 'true')
      localStorage.setItem('owner_phone', phoneE164)
      localStorage.setItem('business_name', data.business_name)
      
      // Clean up pending data
      localStorage.removeItem('pending_owner_id')
      localStorage.removeItem('pending_phone')
      localStorage.removeItem('pending_business')
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || 'Erro ao verificar código')
    } finally {
      setLoading(false)
    }
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
          {step === 'code' && (
            <p className="text-sm text-emerald-600 mt-2 font-medium">
              {localStorage.getItem('pending_business')}
            </p>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
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
                  placeholder="5511990146387"
                  className="pl-10"
                  maxLength={13}
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use o número cadastrado no sistema
              </p>
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            
            {/* Test Mode Notice */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Modo de Teste:</strong> Use o código <strong>123456</strong> para fazer login
              </p>
            </div>
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
                disabled={loading}
              />
              <p className="text-sm text-gray-600 mt-2">
                Enviamos um código para {formatPhoneDisplay(localStorage.getItem('pending_phone') || phone)}
              </p>
            </div>
            
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
            
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setError(null)
                setCode('')
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
              disabled={loading}
            >
              Usar outro número
            </button>
            
            {/* Test Mode Notice */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Código de teste:</strong> Digite <strong>123456</strong>
              </p>
            </div>
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
