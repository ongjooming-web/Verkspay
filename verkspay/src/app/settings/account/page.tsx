'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
}

interface Modal {
  isOpen: boolean
  emailConfirm: string
  isDeleting: boolean
}

export default function AccountSettings() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>({
    isOpen: false,
    emailConfirm: '',
    isDeleting: false
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push('/login')
          return
        }
        setUser(user as User)
      } catch (err) {
        console.error('Error fetching user:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const handleDeleteClick = () => {
    setModal({ ...modal, isOpen: true })
    setError('')
  }

  const handleCloseModal = () => {
    setModal({ isOpen: false, emailConfirm: '', isDeleting: false })
    setError('')
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    // Validate email confirmation
    if (modal.emailConfirm !== user.email) {
      setError(`Please enter your email address (${user.email}) to confirm`)
      return
    }

    setModal({ ...modal, isDeleting: true })
    setError('')

    try {
      // Get current session to retrieve auth token
      console.log('[Settings] 📍 Getting auth session for account deletion...')
      console.log('[Settings] Current time:', new Date().toISOString())
      
      // Refresh session first to ensure token is fresh
      console.log('[Settings] Refreshing session...')
      const refreshResult = await supabase.auth.refreshSession()
      console.log('[Settings] Refresh result:', !!refreshResult.data?.session)
      
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      console.log('[Settings] ✓ Session retrieved:', {
        hasSession: !!session,
        hasToken: !!token,
        tokenLength: token?.length,
        userEmail: session?.user?.email
      })

      if (!token) {
        const errorMsg = 'Not authenticated. Please log in again.'
        console.error('[Settings] ❌ Delete failed: no token found')
        setError(errorMsg)
        setModal({ ...modal, isDeleting: false })
        return
      }

      // Call Next.js API route with authorization token
      console.log('[Settings] 🚀 Calling /api/account/delete...')
      const startTime = Date.now()
      
      const response = await fetch(
        '/api/account/delete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email: user.email })
        }
      )

      const duration = Date.now() - startTime
      console.log(`[Settings] Response received in ${duration}ms:`, { status: response.status, ok: response.ok })
      
      const data = await response.json()

      console.log('[Settings] Delete account response:', {
        status: response.status,
        ok: response.ok,
        data
      })

      if (!response.ok) {
        let errorMsg = data.error || `Failed to delete account (${response.status})`
        
        // Provide more helpful error messages
        if (response.status === 401) {
          errorMsg = 'Authentication failed. Please log in again.'
        } else if (response.status === 403) {
          errorMsg = 'You do not have permission to delete this account.'
        } else if (response.status === 404) {
          errorMsg = 'Account not found.'
        }
        
        console.error('[Settings] Delete failed:', {
          status: response.status,
          error: errorMsg,
          details: data
        })
        setError(errorMsg)
        setModal({ ...modal, isDeleting: false })
        return
      }

      // Success - redirect to goodbye page
      setSuccess('Your account has been permanently deleted.')
      setTimeout(() => {
        window.location.href = '/goodbye'
      }, 2000)
    } catch (err) {
      console.error('Error deleting account:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setModal({ ...modal, isDeleting: false })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass px-8 py-12 rounded-lg text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-gray-300">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center">
            <p className="text-red-300 mb-4">Not logged in</p>
            <Link href="/login">
              <Button className="w-full">← Back to Login</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-gray-400">Manage your account and privacy</p>
        </div>

        {/* Account Info */}
        <Card className="mb-8 border-blue-500/30">
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Account Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Email Address</p>
              <p className="text-white font-mono text-lg">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Account ID</p>
              <p className="text-white font-mono text-sm break-all">{user.id}</p>
            </div>
          </CardBody>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/30 bg-gradient-to-r from-red-500/5 to-transparent">
          <CardHeader>
            <h2 className="text-xl font-bold text-red-400">⚠️ Danger Zone</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="text-gray-300 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                onClick={handleDeleteClick}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition"
              >
                🗑️ Delete My Account
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Success Message */}
        {success && (
          <div className="mt-6 glass rounded-lg p-4 border-green-500/30 bg-green-500/10">
            <p className="text-green-300 text-sm">{success}</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md border-red-500/40 bg-gradient-to-b from-red-500/10 to-slate-900">
            <CardHeader>
              <h3 className="text-2xl font-bold text-red-400">Delete Account?</h3>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Warning */}
              <div className="glass rounded-lg p-4 border-red-500/30 bg-red-500/10">
                <p className="text-red-300 font-semibold mb-2">⚠️ This action is permanent and cannot be undone</p>
                <p className="text-red-200 text-sm">Once deleted, your account and all data will be permanently removed.</p>
              </div>

              {/* What will be deleted */}
              <div>
                <p className="text-gray-300 font-semibold mb-3">This will delete:</p>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> All your invoices
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> All client information
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> Payment details and settings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> Proposals and contracts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> Payment reminders and history
                  </li>
                </ul>
              </div>

              {/* Error message */}
              {error && (
                <div className="glass rounded-lg p-3 border-red-500/30 bg-red-500/10">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Email confirmation */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Type your email address to confirm:
                </label>
                <input
                  type="email"
                  value={modal.emailConfirm}
                  onChange={(e) => setModal({ ...modal, emailConfirm: e.target.value })}
                  placeholder={user.email}
                  className="w-full px-4 py-2 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCloseModal}
                  disabled={modal.isDeleting}
                  className="flex-1 border border-white/20 hover:border-white/40 text-white py-2 rounded-lg transition"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={modal.isDeleting || modal.emailConfirm !== user.email}
                  className={`flex-1 font-semibold py-2 rounded-lg transition ${
                    modal.isDeleting || modal.emailConfirm !== user.email
                      ? 'bg-red-600/50 text-red-200/50 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {modal.isDeleting ? '🗑️ Deleting...' : '🗑️ Permanently Delete Account'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
