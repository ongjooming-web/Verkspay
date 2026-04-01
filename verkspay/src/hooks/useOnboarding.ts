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

  // Show tour: ONLY if completed === false (one chance only)
  // If user skips or completes tour once, it NEVER shows again
  // Tour shows for all steps (0-7) until completed
  const showTour = useMemo(() => {
    if (loading || !status) return false
    // Tour shows as long as NOT completed
    return status.completed === false
  }, [loading, status])

  // Show progress bar: if NOT dismissed AND NOT completed
  // If user dismisses, it stays hidden
  // UNLESS all 5 tasks are completed (then show celebration briefly)
  const showProgress = useMemo(() => {
    if (loading || !status) return false
    // Hide if completed or dismissed
    if (status.completed || status.dismissed) return false
    // Show if any tasks incomplete
    return status.completed_count < status.total_tasks
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
        // Update local state immediately for instant UI feedback
        setStatus(prev => prev ? { ...prev, tour_step: step } : null)
        console.log('[useOnboarding] Tour step updated to:', step)
        
        // Trigger a refresh to get latest task completion status
        // This ensures the tour shows the next step with updated task completion
        setTimeout(() => refresh(), 100)
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
        // Update local state immediately for instant UI feedback
        setStatus(prev => prev ? { ...prev, dismissed: true } : null)
        console.log('[useOnboarding] Progress dismissed')
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
        body: JSON.stringify({ completed: true, tour_step: 8 })
      })
      if (res.ok) {
        // Update local state immediately for instant UI feedback
        setStatus(prev => prev ? { ...prev, completed: true, tour_step: 8 } : null)
        console.log('[useOnboarding] Onboarding completed')
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
