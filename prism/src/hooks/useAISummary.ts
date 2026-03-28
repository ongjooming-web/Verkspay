import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface AISummaryResponse {
  summary: string
  suggested_tags: string[]
  generated_at: string
}

export function useAISummary(clientId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AISummaryResponse | null>(null)

  const generateSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/clients/${clientId}/ai-summary`, {
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
        setError(errorData.error || 'Failed to generate summary')
        setLoading(false)
        return
      }

      const result = await response.json()
      setData(result)

      console.log('[useAISummary] Generated summary for client', clientId)
    } catch (err) {
      console.error('[useAISummary] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    generateSummary
  }
}
