'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Card, CardBody, CardHeader } from '@/components/Card'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess('Account created! Redirecting...')
      setTimeout(() => router.push('/login'), 1500)
    }
  }

  return (
    <div className="min-h-screen relative z-10 flex justify-center items-center p-4 overflow-hidden">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-12 h-12" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rainbowGradientSignup" x1="0%" y1="0%" x2="100%" y2="100%">
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
                       fill="url(#rainbowGradientSignup)" 
                       stroke="url(#rainbowGradientSignup)" 
                       strokeWidth="1.5"/>
              <text x="50" y="60" fontSize="40" fontWeight="bold" textAnchor="middle" 
                    dominantBaseline="middle" fill="white" fontFamily="Arial">◆</text>
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Prism
          </h1>
          <p className="text-gray-400 text-sm mt-2">Create your account to get started</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="glass border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="glass border-green-500/50 bg-green-500/10 text-green-300 px-4 py-3 rounded-lg text-sm">
                ✓ {success}
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
              <p className="text-gray-400 text-xs mt-1">At least 6 characters</p>
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
              {loading ? '⏳ Creating account...' : '✓ Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
