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

  const fetchForecast = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch('/api/revenue-forecast', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      if (response.status === 403) {
        setIsAvailable(false)
        setError('Revenue forecasting requires Enterprise plan')
        setData(null)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch forecast')
        setLoading(false)
        return
      }

      const forecastData = await response.json()
      setData(forecastData)
      setIsAvailable(true)

      console.log('[useRevenueForecast] Fetched forecast data')
    } catch (err) {
      console.error('[useRevenueForecast] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
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
    refetch: fetchForecast
  }
}
