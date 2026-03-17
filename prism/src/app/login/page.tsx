'use client'

import { useState } from 'react'
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
        setError(error.message || 'Failed to sign in')
        setLoading(false)
      } else {
        console.log('Login successful:', data)
        console.log('Session established, redirecting to dashboard...')
        // Middleware will handle the redirect when page reloads
        window.location.href = '/dashboard'
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
          <Link href="/" className="flex justify-center mb-4">
            <svg className="w-12 h-12 hover:opacity-80 transition-opacity cursor-pointer" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rainbowGradientLogin" x1="0%" y1="0%" x2="100%" y2="100%">
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
                       fill="url(#rainbowGradientLogin)" 
                       stroke="url(#rainbowGradientLogin)" 
                       strokeWidth="1.5"/>
              <text x="50" y="60" fontSize="40" fontWeight="bold" textAnchor="middle" 
                    dominantBaseline="middle" fill="white" fontFamily="Arial">◆</text>
            </svg>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Prism
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
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
