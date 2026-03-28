'use client'

import { useState, useEffect, useMemo } from 'react'

export interface OnboardingStatus {
  completed: boolean
  dismissed: boolean
  tasks: {
    business_profile: boolean
    stripe_connected: boolean
    first_client: boolean
    first_invoice: boolean
    ai_insights: boolean
  }
  completed_count: number
  total_tasks: number
  tour_step: number
}

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const isComplete = status?.completed || false
  const isDismissed = status?.dismissed || false
  const completedCount = status?.completed_count || 0
  const totalTasks = status?.total_tasks || 5
  const tourStep = status?.tour_step || 0

  // Show tour only on first login (step 0, not completed) - use useMemo to ensure proper recalculation
  const showTour = useMemo(() => {
    if (loading || !status) return false
    return !status.completed && status.tour_step === 0
  }, [loading, status])

  // Show progress bar if tasks incomplete, not dismissed, and not completed
  const showProgress = useMemo(() => {
    if (loading || !status) return false
    return !status.completed && !status.dismissed
  }, [loading, status])

  const refresh = async () => {
    try {
      setLoading(true)
      
      // Get the current session to include auth token
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const res = await fetch('/api/onboarding/status', { headers })
      if (res.ok) {
        const data = await res.json()
        console.log('[useOnboarding] Status fetched:', data)
        setStatus(data)
      } else {
        console.log('[useOnboarding] Status fetch failed:', res.status)
      }
    } catch (err) {
      console.error('[useOnboarding] Error fetching status:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateTourStep = async (step: number) => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const res = await fetch('/api/onboarding/update', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ tour_step: step })
      })
      if (res.ok) {
        await refresh()
      }
    } catch (err) {
      console.error('[useOnboarding] Error updating tour step:', err)
    }
  }

  const dismissProgress = async () => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const res = await fetch('/api/onboarding/update', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ dismissed: true })
      })
      if (res.ok) {
        await refresh()
      }
    } catch (err) {
      console.error('[useOnboarding] Error dismissing progress:', err)
    }
  }

  const completeOnboarding = async () => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const res = await fetch('/api/onboarding/update', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ completed: true })
      })
      if (res.ok) {
        await refresh()
      }
    } catch (err) {
      console.error('[useOnboarding] Error completing onboarding:', err)
    }
  }

  useEffect(() => {
    console.log('[useOnboarding] Hook mounted, fetching status...')
    refresh()
  }, [])

  return {
    status,
    loading,
    isComplete,
    isDismissed,
    completedCount,
    totalTasks,
    tourStep,
    showTour,
    showProgress,
    updateTourStep,
    dismissProgress,
    completeOnboarding,
    refresh
  }
}
