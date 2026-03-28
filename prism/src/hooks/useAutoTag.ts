import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAutoTag() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])

  const runAutoTagging = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch('/api/clients/auto-tag', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to run auto-tagging')
        setLoading(false)
        return
      }

      setResults(data.results || [])
      console.log('[useAutoTag] Auto-tagged', data.autoTagged, 'clients')
    } catch (err) {
      console.error('[useAutoTag] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    results,
    runAutoTagging
  }
}
