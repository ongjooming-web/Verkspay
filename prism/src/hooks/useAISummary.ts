import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface AISummaryResponse {
  summary: string
  suggested_tags: string[]
  generated_at: string
}

export function useAISummary(clientId: string) {
  const [loading, setLoading] = useState(false) // Don't show loading during initial mount (just loading cached data)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AISummaryResponse | null>(null)
  const [isFresh, setIsFresh] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  // Load cached summary on mount
  useEffect(() => {
    const loadCachedSummary = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          setLoading(false)
          return
        }

        // Fetch client's cached summary
        const { data: client } = await supabase
          .from('clients')
          .select('ai_summary, ai_summary_generated_at')
          .eq('id', clientId)
          .single()

        // Fetch user's profile for rate limit
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, ai_summary_count')
          .eq('id', userData.user.id)
          .single()

        if (client?.ai_summary && client?.ai_summary_generated_at) {
          const generatedDate = new Date(client.ai_summary_generated_at)
          const now = new Date()
          const daysSince = Math.floor((now.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24))

          // If cached summary is less than 7 days old, use it
          if (daysSince < 7) {
            setData({
              summary: client.ai_summary,
              suggested_tags: [],
              generated_at: client.ai_summary_generated_at
            })
            setIsFresh(true)
            console.log('[useAISummary] Loaded cached summary for client', clientId)
          }
        }

        // Set remaining count
        if (profile) {
          const plan = profile.plan || 'trial'
          const limit = plan === 'pro' ? 10 : (plan === 'enterprise' ? Infinity : 0)
          const used = profile.ai_summary_count || 0
          setRemaining(Math.max(0, limit - used))
        }

        setLoading(false)
      } catch (err) {
        console.error('[useAISummary] Error loading cached summary:', err)
        setError(null) // Don't show error during initial load
        setLoading(false)
      }
    }

    loadCachedSummary()
  }, [clientId])

  const generateSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      setIsLocked(false)

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
        // Gracefully handle plan gating
        setIsLocked(true)
        setError(null) // Don't show error message for locked features
        setData(null)
        setLoading(false)
        console.log('[useAISummary] Feature locked (requires Pro plan or higher)')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to generate summary')
        setData(null)
        setLoading(false)
        return
      }

      const result = await response.json()
      setData(result)
      setIsFresh(true)

      console.log('[useAISummary] Generated summary for client', clientId)
    } catch (err) {
      console.error('[useAISummary] Error:', err)
      setError('Something went wrong. Please try again.')
      setData(null)
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    isFresh,
    remaining,
    isLocked,
    generateSummary
  }
}
