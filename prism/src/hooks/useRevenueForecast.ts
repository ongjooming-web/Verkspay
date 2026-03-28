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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(true)
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

      const response = await fetch('/api/revenue-forecast', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      if (response.status === 403) {
        // Gracefully handle plan gating
        setIsLocked(true)
        setIsAvailable(false)
        setData(null)
        setError(null) // Don't show error, show locked state instead
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
