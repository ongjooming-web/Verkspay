import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface GrowthOpportunitiesResponse {
  opportunities: string
  engagement_score: number
  monthly_average: number
  generated_at: string
}

export function useGrowthOpportunities(clientId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<GrowthOpportunitiesResponse | null>(null)

  const generateOpportunities = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/clients/${clientId}/growth-opportunities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 403) {
        const errorData = await response.json()
        setError(errorData.error)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to generate opportunities')
        setLoading(false)
        return
      }

      const result = await response.json()
      setData(result)

      console.log('[useGrowthOpportunities] Generated opportunities for client', clientId)
    } catch (err) {
      console.error('[useGrowthOpportunities] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    generateOpportunities
  }
}
