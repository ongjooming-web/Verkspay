'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Card, CardBody, CardHeader } from '@/components/Card'

export default function VerifyEmail() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendDisabled, setResendDisabled] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
    if (countdown === 0 && resendDisabled) {
      setResendDisabled(false)
    }
  }, [countdown, resendDisabled])

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!email) {
        setError('Please enter your email address')
        setLoading(false)
        return
      }

      console.log('[VerifyEmail] Resending verification email to:', email)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        console.error('[VerifyEmail] Resend error:', error)
        setError(error.message || 'Failed to resend verification email')
        setLoading(false)
      } else {
        console.log('[VerifyEmail] Verification email resent successfully')
        setSuccess('✓ Verification email sent! Check your inbox.')
        setResendDisabled(true)
        setCountdown(60)
      }
    } catch (err) {
      console.error('[VerifyEmail] Unexpected error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setError('')
    setSuccess('')
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
                <linearGradient id="rainbowGradientVerify" x1="0%" y1="0%" x2="100%" y2="100%">
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
                       fill="url(#rainbowGradientVerify)" 
                       stroke="url(#rainbowGradientVerify)" 
                       strokeWidth="1.5"/>
              <text x="50" y="60" fontSize="40" fontWeight="bold" textAnchor="middle" 
                    dominantBaseline="middle" fill="white" fontFamily="Arial">◆</text>
            </svg>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Verify Email
          </h1>
          <p className="text-gray-400 text-sm mt-2">Confirm your email to activate your account</p>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            {/* Main message */}
            <div className="glass rounded-lg p-4 border-blue-400/30 bg-blue-500/10">
              <p className="text-blue-300 text-sm leading-relaxed">
                We've sent a verification link to:
              </p>
              <p className="text-white font-semibold mt-2 break-all">
                {email || 'your email address'}
              </p>
              <p className="text-blue-300 text-sm mt-3">
                Click the link in the email to verify your account.
              </p>
            </div>

            {/* Error/Success messages */}
            {error && (
              <div className="glass border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="glass border-green-500/50 bg-green-500/10 text-green-300 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Email input for resend */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                required
                placeholder="you@example.com"
                className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
              />
              <p className="text-gray-500 text-xs mt-1">Update if verification link was sent to a different email</p>
            </div>

            {/* Resend button */}
            <Button
              onClick={handleResendEmail}
              disabled={loading || resendDisabled}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? (
                '⏳ Sending...'
              ) : resendDisabled ? (
                `📧 Resend in ${countdown}s`
              ) : (
                '📧 Resend Verification Email'
              )}
            </Button>

            {/* Help text */}
            <div className="border-t border-white/10 pt-4">
              <p className="text-gray-400 text-xs text-center mb-3">
                After verifying your email, you can sign in to your account.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  ← Back to Sign In
                </Button>
              </Link>
            </div>

            {/* Contact support */}
            <p className="text-gray-500 text-xs text-center">
              Having trouble?{' '}
              <a href="mailto:support@prismops.xyz" className="text-blue-400 hover:text-blue-300 transition">
                Contact support
              </a>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
