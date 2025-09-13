import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { 
  User, 
  Phone, 
  Mail, 
  Building, 
  Copy, 
  Check, 
  Loader2, 
  ChefHat,
  FileText,
  Users,
  Package,
  Plus,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronRight
} from 'lucide-react'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface Owner {
  id: string
  phone_e164: string
  business_name: string
  email?: string
  created_at: string
  subscription_status: string
}

interface FormLinks {
  vendas?: string
  mao_de_obra?: string
  cadastro_funcionario?: string
  pedido_recebido?: string
}

export default function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [generatedLinks, setGeneratedLinks] = useState<FormLinks | null>(null)
  const [ownerData, setOwnerData] = useState<Owner | null>(null)
  const [existingOwners, setExistingOwners] = useState<Owner[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showExisting, setShowExisting] = useState(false)
  const [expandedLink, setExpandedLink] = useState<string | null>(null)
  
  // Form fields
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Fetch existing owners on mount
  useEffect(() => {
    fetchExistingOwners()
  }, [])

  const fetchExistingOwners = async () => {
    try {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setExistingOwners(data || [])
    } catch (error) {
      console.error('Error fetching owners:', error)
    }
  }

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Keep only digits, starting with 55
    if (!digits.startsWith('55')) {
      return '55' + digits
    }
    return digits.slice(0, 13) // 5511999999999 = 13 digits
  }

  const cleanPhone = (formatted: string) => {
    // Return plain number without +
    const digits = formatted.replace(/\D/g, '')
    if (digits.startsWith('55') && digits.length === 13) {
      return digits // No + sign
    }
    if (digits.length === 11) {
      return `55${digits}` // No + sign
    }
    return digits
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
  }

  const onboardNewOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const phoneE164 = cleanPhone(phone)
      
      if (phoneE164.length < 13) {
        throw new Error('Telefone inválido. Use o formato (11) 99999-9999')
      }

      // Call the edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboard-owner`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone_e164: phoneE164,
            business_name: businessName,
            email: email || undefined,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to onboard owner')
      }

      // Success!
      setGeneratedLinks(data.links)
      setOwnerData({
        id: data.owner_id,
        phone_e164: phoneE164,
        business_name: businessName,
        email: email || undefined,
        created_at: new Date().toISOString(),
        subscription_status: 'trial'
      })

      toast.success('Restaurante cadastrado com sucesso!')
      
      // Refresh the list
      fetchExistingOwners()
      
      // Clear form
      setBusinessName('')
      setPhone('')
      setEmail('')

    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Erro ao cadastrar restaurante')
    } finally {
      setLoading(false)
    }
  }

  const regenerateLinks = async (ownerId: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-owner-links`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ owner_id: ownerId }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate links')
      }

      setGeneratedLinks(data.links)
      
      // Find and set owner data
      const owner = existingOwners.find(o => o.id === ownerId)
      if (owner) {
        setOwnerData(owner)
      }

      toast.success('Links gerados com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar links')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copiado!`)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAllLinks = () => {
    if (!generatedLinks || !ownerData) return

    const message = `🎉 *Bem-vindo ao Sistema de Gestão, ${ownerData.business_name}!*

Seus formulários personalizados:

📊 *VENDAS DIÁRIAS*
${generatedLinks.vendas}

👥 *CADASTRAR FUNCIONÁRIO*
${generatedLinks.cadastro_funcionario}

⏰ *REGISTRO DE TURNOS*
${generatedLinks.mao_de_obra}

📦 *PEDIDOS RECEBIDOS*
${generatedLinks.pedido_recebido}

*Como usar:*
1️⃣ Salve esses links nos favoritos
2️⃣ Preencha vendas todo dia no fechamento
3️⃣ Me pergunte "quanto vendi hoje?" quando quiser

*IMPORTANTE:* Cadastre seus funcionários primeiro!

Digite "ajuda" para ver comandos disponíveis.`

    navigator.clipboard.writeText(message)
    toast.success('Mensagem completa copiada! Cole no WhatsApp')
  }

  const filteredOwners = existingOwners.filter(owner => 
    owner.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.phone_e164?.includes(searchTerm) ||
    owner.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-3 rounded-xl">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Restaurant Onboarding</h1>
                <p className="text-gray-600">Sistema de cadastro rápido de restaurantes</p>
              </div>
            </div>
            <button
              onClick={() => setShowExisting(!showExisting)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>{existingOwners.length} cadastrados</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Cadastrar Novo Restaurante
            </h2>

            <form onSubmit={onboardNewOwner} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4" />
                  Nome do Restaurante
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900"
                  placeholder="Pizzaria do João"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900"
                  placeholder="5511999999999"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900"
                  placeholder="joao@restaurante.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Cadastrar e Gerar Links
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Links Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Links Gerados
            </h2>

            {generatedLinks && ownerData ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-sm text-emerald-800 mb-2">
                    <strong>{ownerData.business_name}</strong>
                  </p>
                  <p className="text-xs text-emerald-600">
                    {ownerData.phone_e164} {ownerData.email && `• ${ownerData.email}`}
                  </p>
                </div>

                <div className="space-y-3">
                  {Object.entries(generatedLinks).map(([key, url]) => {
                    const icons = {
                      vendas: '📊',
                      cadastro_funcionario: '👥',
                      mao_de_obra: '⏰',
                      pedido_recebido: '📦'
                    }
                    const labels = {
                      vendas: 'Vendas Diárias',
                      cadastro_funcionario: 'Cadastrar Funcionário',
                      mao_de_obra: 'Registro de Turnos',
                      pedido_recebido: 'Pedidos Recebidos'
                    }

                    const isExpanded = expandedLink === key

                    return (
                      <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 p-3 bg-gray-50">
                          <span className="text-2xl">{icons[key as keyof typeof icons]}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              {labels[key as keyof typeof labels]}
                            </p>
                          </div>
                          <button
                            onClick={() => setExpandedLink(isExpanded ? null : key)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <ChevronRight 
                              className={`w-4 h-4 text-gray-500 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`} 
                            />
                          </button>
                          <button
                            onClick={() => copyToClipboard(url!, key)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {copied === key ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-500" />
                          </a>
                        </div>
                        {isExpanded && (
                          <div className="p-3 bg-white border-t border-gray-200">
                            <p className="text-xs text-gray-600 break-all">
                              {url}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={copyAllLinks}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Copiar Mensagem WhatsApp
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                <p>Nenhum link gerado ainda</p>
                <p className="text-sm mt-1">Cadastre um restaurante ou selecione um existente</p>
              </div>
            )}
          </div>
        </div>

        {/* Existing Owners Section */}
        {showExisting && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Restaurantes Cadastrados
              </h2>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900"
                  placeholder="Buscar..."
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOwners.map((owner) => (
                <div key={owner.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <p className="font-semibold text-gray-800">{owner.business_name}</p>
                  <p className="text-sm text-gray-600">{owner.phone_e164}</p>
                  {owner.email && (
                    <p className="text-sm text-gray-500">{owner.email}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      owner.subscription_status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {owner.subscription_status}
                    </span>
                    <button
                      onClick={() => regenerateLinks(owner.id)}
                      className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Gerar Links
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredOwners.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhum restaurante encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
