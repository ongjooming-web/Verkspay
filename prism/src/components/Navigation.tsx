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
    <nav className="glass sticky top-0 z-50 mb-8">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          ◆ Prism
        </Link>
        <div className="flex gap-8 items-center">
          <Link href="/dashboard" className="text-gray-300 hover:text-blue-400 transition-colors font-medium">
            Dashboard
          </Link>
          <Link href="/clients" className="text-gray-300 hover:text-blue-400 transition-colors font-medium">
            Clients
          </Link>
          <Link href="/invoices" className="text-gray-300 hover:text-blue-400 transition-colors font-medium">
            Invoices
          </Link>
          <Link href="/proposals" className="text-gray-300 hover:text-blue-400 transition-colors font-medium">
            Proposals
          </Link>
          <Link href="/settings" className="text-gray-300 hover:text-blue-400 transition-colors font-medium">
            Settings
          </Link>
          <Button variant="outline" size="sm" onClick={handleLogout} className="ml-4">
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
