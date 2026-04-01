'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Card, CardBody, CardHeader } from '@/components/Card'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user has a valid session from the password reset email link
    const checkSession = async () => {
      try {
        console.log('[ResetPassword] Checking for valid reset session...')
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[ResetPassword] Session error:', sessionError)
          setError('Invalid or expired reset link. Please request a new one.')
          return
        }

        if (!session) {
          console.error('[ResetPassword] No session found')
          setError('Invalid reset link. Please request a new password reset.')
          return
        }

        console.log('[ResetPassword] Valid session found for user:', session.user.email)
        setSessionReady(true)
      } catch (err) {
        console.error('[ResetPassword] Unexpected error checking session:', err)
        setError('An error occurred. Please try again.')
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!password || !confirmPassword) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters')
        setLoading(false)
        return
      }

      console.log('[ResetPassword] Updating password...')

      // Use updateUser which requires a valid session (from the reset email link)
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error('[ResetPassword] Error:', error)
        // Check if it's a session error
        if (error.status === 401 || error.message?.includes('session')) {
          setError('Reset link expired. Please request a new password reset.')
        } else {
          setError(error.message || 'Failed to reset password')
        }
        setLoading(false)
      } else {
        console.log('[ResetPassword] Password updated successfully')
        setSuccess('✓ Password reset successful! Redirecting to login...')
        
        // Sign out to clear the reset session
        await supabase.auth.signOut()
        
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      console.error('[ResetPassword] Unexpected error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden flex justify-center items-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl border border-white/10">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
            <svg className="w-12 h-12 hover:opacity-80 transition-opacity cursor-pointer" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rainbowGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
                  <stop offset="16.67%" style={{ stopColor: '#ff9f6b', stopOpacity: 1 }} />
                  <stop offset="33.33%" style={{ stopColor: '#ffd93d', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: '#6bdb77', stopOpacity: 1 }} />
                  <stop offset="66.67%" style={{ stopColor: '#4d96ff', stopOpacity: 1 }} />
                  <stop offset="83.33%" style={{ stopColor: '#b565d8', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#ff6b6b', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <polygon points="50,5 93.3,28.33 93.3,75 50,98.33 6.7,75 6.7,28.33" 
                       fill="url(#rainbowGradient2)" 
                       stroke="url(#rainbowGradient2)" 
                       strokeWidth="1.5"/>
              <text x="50" y="60" fontSize="40" fontWeight="bold" textAnchor="middle" 
                    dominantBaseline="middle" fill="white" fontFamily="Arial">◆</text>
            </svg>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Verkspay
          </h1>
          <p className="text-gray-400 text-sm mt-2">Create a new password</p>
        </CardHeader>
        <CardBody>
          {!sessionReady && !error && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Verifying reset link...</p>
              <div className="mt-4 inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="glass border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
              <Link href="/forgot-password">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  📧 Request New Reset Link
                </Button>
              </Link>
            </div>
          )}

          {sessionReady && !error && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <div className="glass border-green-500/50 bg-green-500/10 text-green-300 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!!success}
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
                <p className="text-gray-500 text-xs mt-1">Min. 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={!!success}
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !!success}
                className="w-full"
              >
                {loading ? '⏳ Resetting...' : '🔐 Reset Password'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Know your password?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
