import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface GrowthOpportunitiesResponse {
  opportunities: string
  engagement_score: number
  monthly_average: number
  generated_at: string
}

export function useGrowthOpportunities(clientId: string) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<GrowthOpportunitiesResponse | null>(null)
  const [isFresh, setIsFresh] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  // Load cached opportunities on mount
  useEffect(() => {
    const loadCachedOpportunities = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          setLoading(false)
          return
        }

        // Fetch user's profile for cached insights
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, ai_lead_insights_count, latest_insights')
          .eq('id', userData.user.id)
          .single()

        if (profile?.latest_insights && typeof profile.latest_insights === 'object') {
          const insights = (profile.latest_insights as any).growth_opportunities
          
          if (insights && insights.content && insights.generated_at) {
            const generatedDate = new Date(insights.generated_at)
            const now = new Date()
            const daysSince = Math.floor((now.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24))

            // If cached insights are less than 7 days old, use them
            if (daysSince < 7) {
              setData({
                opportunities: insights.content,
                engagement_score: insights.engagement_score || 0,
                monthly_average: insights.monthly_average || 0,
                generated_at: generatedDate.toISOString()
              })
              setIsFresh(true)
              console.log('[useGrowthOpportunities] Loaded cached opportunities')
            }
          }
        }

        // Set remaining count - Enterprise only gets 30/month
        if (profile?.plan === 'enterprise') {
          const used = profile.ai_lead_insights_count || 0
          setRemaining(Math.max(0, 30 - used))
        }

        setLoading(false)
      } catch (err) {
        console.error('[useGrowthOpportunities] Error loading cached opportunities:', err)
        setLoading(false)
      }
    }

    loadCachedOpportunities()
  }, [clientId])

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
      setIsFresh(true)

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
    isFresh,
    remaining,
    generateOpportunities
  }
}
