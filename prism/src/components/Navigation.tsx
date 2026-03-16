'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'

export function Navigation() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
          Prism
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
            Dashboard
          </Link>
          <Link href="/clients" className="text-gray-700 hover:text-blue-600">
            Clients
          </Link>
          <Link href="/invoices" className="text-gray-700 hover:text-blue-600">
            Invoices
          </Link>
          <Link href="/settings" className="text-gray-700 hover:text-blue-600">
            Settings
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
