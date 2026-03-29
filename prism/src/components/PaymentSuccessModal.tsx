'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/Card'
import { Button } from '@/components/Button'

export function PaymentSuccessModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [planName, setPlanName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sid = searchParams.get('session_id')
    if (sid) {
      setSessionId(sid)
      fetchSessionDetails(sid)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const fetchSessionDetails = async (sid: string) => {
    try {
      console.log('[PaymentSuccess] Fetching session details:', sid)
      const response = await fetch(`/api/billing/session-details?session_id=${sid}`)
      
      if (!response.ok) {
        console.error('[PaymentSuccess] Failed to fetch session:', response.status)
        setLoading(false)
        return
      }

      const data = await response.json()
      console.log('[PaymentSuccess] Session data:', data)
      
      if (data.plan) {
        // Format plan name: "pro" → "Pro", "enterprise" → "Enterprise"
        const formatted = data.plan.charAt(0).toUpperCase() + data.plan.slice(1)
        setPlanName(formatted)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('[PaymentSuccess] Error fetching session:', error)
      setLoading(false)
    }
  }

  if (!sessionId) {
    return null
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardBody className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-4"></div>
            <p className="text-gray-300">Processing payment...</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-500/30 bg-gradient-to-b from-green-500/10 to-slate-900">
        <CardBody className="text-center py-8">
          {/* Success icon */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful! 🎉</h2>

          {/* Plan info */}
          {planName && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">You've been upgraded to</p>
              <p className="text-lg font-semibold text-green-300">{planName} Plan</p>
            </div>
          )}

          {/* Message */}
          <p className="text-gray-300 mb-6">
            Your subscription is now active. You can start using all features immediately.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg min-h-[44px]"
            >
              Go to Dashboard
            </Button>
            <button
              onClick={() => router.push('/settings')}
              className="w-full text-gray-400 hover:text-gray-300 py-3 text-sm font-medium transition"
            >
              Stay on Settings
            </button>
          </div>

          {/* Session ID (for reference) */}
          <p className="text-xs text-gray-600 mt-6">Session: {sessionId.substring(0, 8)}...</p>
        </CardBody>
      </Card>
    </div>
  )
}
