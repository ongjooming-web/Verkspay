'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Card, CardBody, CardHeader } from '@/components/Card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Handle email confirmation callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check both hash and query parameters for auth tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const queryParams = new URLSearchParams(window.location.search)
        
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
        const code = queryParams.get('code')
        const type = hashParams.get('type') || queryParams.get('type')

        console.log('[Login] Auth callback detected:', { accessToken: !!accessToken, code: !!code, type })

        if (accessToken && type === 'recovery') {
          // Password recovery flow
          console.log('[Login] Password recovery token detected')
          return
        }

        if (accessToken) {
          // Email confirmation or OAuth callback
          console.log('[Login] Access token detected, redirecting to dashboard')
          // Supabase SDK automatically handles the token from URL
          // Wait a moment for Supabase to process the session
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
        } else if (code) {
          // OAuth code flow - Supabase will exchange the code
          console.log('[Login] Auth code detected, redirecting to dashboard')
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
        }
      } catch (err) {
        console.error('[Login] Error in auth callback:', err)
      }
    }

    handleAuthCallback()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      console.log('Attempting login with:', { email })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Login response:', { data, error })

      if (error) {
        console.error('Login error:', error)
        
        // Check if it's an unconfirmed email error
        if (error.message?.includes('Email not confirmed') || error.status === 422) {
          console.log('User email not confirmed')
          setError('Please verify your email first')
          setLoading(false)
          // Show resend button by displaying verify-email page
          setTimeout(() => {
            router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          }, 1500)
        } else {
          setError(error.message || 'Failed to sign in')
          setLoading(false)
        }
      } else if (data.user) {
        console.log('Login successful:', data)
        
        // Check if email is confirmed
        if (!data.user.confirmed_at) {
          console.log('User email not confirmed - redirecting to verify-email')
          setError('Please verify your email first')
          setLoading(false)
          setTimeout(() => {
            router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          }, 1500)
        } else {
          console.log('Email confirmed - redirecting to dashboard')
          router.push('/dashboard')
        }
      }
    } catch (err) {
      console.error('Unexpected error during login:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      console.log('Attempting Google sign-in...')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        console.error('Google sign-in error:', error)
        setError(error.message || 'Failed to sign in with Google')
      }
    } catch (err) {
      console.error('Unexpected error during Google sign-in:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
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
          <Link href="/" className="flex justify-center mb-4 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Verkspay Logo" className="w-16 h-16" />
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Verkspay
          </h1>
          <p className="text-gray-400 text-sm mt-2">Sign in to your account</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="glass border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full"
            >
              {loading ? '⏳ Signing in...' : '✓ Sign In'}
            </Button>
          </form>

          {/* Google Sign-In disabled until enabled in Supabase */}
          {/* <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-gray-400">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full mt-4"
            >
              🔵 Google
            </Button>
          </div> */}

          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign up now
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
