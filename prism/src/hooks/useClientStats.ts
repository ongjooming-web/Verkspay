import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useClientStats(clientId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const triggerAggregation = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch('/api/clients/aggregate-stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to aggregate stats')
        setLoading(false)
        return
      }

      console.log('[useClientStats] Aggregated stats for', data.updated, 'clients')
    } catch (err) {
      console.error('[useClientStats] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clientId) {
      triggerAggregation()
    }
  }, [clientId])

  return {
    loading,
    error,
    triggerAggregation
  }
}
