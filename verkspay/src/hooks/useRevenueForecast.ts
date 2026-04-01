import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface Forecast {
  total: number
  breakdown: {
    recurring: number
    outstanding: number
    trend: number
  }
  confidence: 'high' | 'medium' | 'low'
  notes: string[]
}

export interface RevenueForecastData {
  period_30_days: Forecast
  period_60_days: Forecast
  period_90_days: Forecast
  generated_at: string
}

export function useRevenueForecast() {
  const [data, setData] = useState<RevenueForecastData | null>(null)
  const [loading, setLoading] = useState(true) // Start as true so we show loading state
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(false) // Start as false until we know
  const [isLocked, setIsLocked] = useState(false)

  const fetchForecast = async () => {
    try {
      setLoading(true)
      setError(null)
      setIsLocked(false)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setData(null)
        setIsAvailable(false)
        setLoading(false)
        return
      }

      // Step 1: Check plan BEFORE fetching (Enterprise only)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, email')
        .eq('id', sessionData.session.user.id)
        .single()

      const plan = profileData?.plan || 'trial'
      const email = profileData?.email || ''
      const masterTestEmails = (process.env.NEXT_PUBLIC_MASTER_TEST_EMAILS || '').split(',')
      const isMaster = masterTestEmails.includes(email)

      // Enterprise only: lock immediately for non-Enterprise, non-Master
      if (!isMaster && plan !== 'enterprise') {
        console.log('[useRevenueForecast] Plan locked:', plan)
        setIsLocked(true)
        setIsAvailable(false)
        setData(null)
        setLoading(false)
        return
      }

      // Step 2: Fetch if plan allows it
      const response = await fetch('/api/revenue-forecast', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      if (response.status === 403) {
        // Gracefully handle any remaining 403 responses
        setIsLocked(true)
        setIsAvailable(false)
        setData(null)
        setError(null)
        setLoading(false)
        console.log('[useRevenueForecast] Feature locked (requires Enterprise plan)')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to fetch forecast')
        setData(null)
        setIsAvailable(false)
        setLoading(false)
        return
      }

      const forecastData = await response.json()
      setData(forecastData)
      setIsAvailable(true)
      setIsLocked(false)

      console.log('[useRevenueForecast] Fetched forecast data')
    } catch (err) {
      console.error('[useRevenueForecast] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData(null)
      setIsAvailable(false)
      setIsLocked(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecast()
  }, [])

  return {
    data,
    loading,
    error,
    isAvailable,
    isLocked,
    refetch: fetchForecast
  }
}
