// Supplier List component
'use client'

import Link from 'next/link'
import { FileText, Phone, Mail, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Supplier } from '@/lib/mock-data'

interface SupplierListProps {
  suppliers: Supplier[]
}

export default function SupplierList({ suppliers }: SupplierListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {suppliers.map((supplier) => (
        <Card key={supplier.id} className="hover:shadow-md transition-shadow">
          <Link href={`/suppliers/${supplier.id}`}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                  {supplier.cnpj && (
                    <p className="text-sm text-gray-500 mt-1">{supplier.cnpj}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              
              
              <div className="space-y-2">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {supplier.phone}
                  </div>
                )}
                
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {supplier.email}
                  </div>
                )}
              </div>
              
            </div>
          </Link>
        </Card>
      ))}
    </div>
  )
}
