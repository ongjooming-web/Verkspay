'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GoodbyePage() {
  useEffect(() => {
    // Ensure user is logged out
    const logout = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        await supabase.auth.signOut()
      } catch (err) {
        console.log('Already logged out')
      }
    }
    logout()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="text-6xl mb-6">👋</div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-white mb-3">Account Deleted</h1>

        {/* Message */}
        <p className="text-gray-400 text-lg mb-2">
          We're sorry to see you go.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Your account and all associated data have been permanently removed.
        </p>

        {/* Details */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8 text-left">
          <h3 className="text-white font-semibold mb-3">What was deleted:</h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> All invoices
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> All clients
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> All proposals
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Payment information
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Account profile
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <p className="text-gray-500 text-sm mb-8">
          Questions? Contact us at{' '}
          <a href="mailto:support@verkspay.com" className="text-blue-400 hover:text-blue-300">
            support@verkspay.com
          </a>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href="/" className="flex-1">
            <button className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition">
              Go Home
            </button>
          </Link>
          <Link href="/signup" className="flex-1">
            <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
              Create New Account
            </button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs mt-8">
          © 2026 Verkspay. Built for freelancers and small teams.
        </p>
      </div>
    </div>
  )
}
