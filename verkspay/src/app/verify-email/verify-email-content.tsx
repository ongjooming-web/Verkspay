'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'

export function VerifyEmailContent() {
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
        <a href="mailto:support@verkspay.com" className="text-blue-400 hover:text-blue-300 transition">
          Contact support
        </a>
      </p>
    </div>
  )
}
