import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface GrowthOpportunitiesResponse {
  opportunities: string
  engagement_score: number
  monthly_average: number
  generated_at: string
}

export function useGrowthOpportunities(clientId: string) {
  const [loading, setLoading] = useState(false) // Don't show loading during initial mount (just loading cached data)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<GrowthOpportunitiesResponse | null>(null)
  const [isFresh, setIsFresh] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  // Load cached opportunities on mount
  useEffect(() => {
    const loadCachedOpportunities = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          setLoading(false)
          return
        }

        // Fetch user's profile for cached insights and rate limits
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, ai_lead_insights_count, ai_lead_insights_reset_date, latest_insights')
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

        // Calculate remaining count based on plan
        if (profile) {
          const plan = profile.plan || 'trial'
          const used = profile.ai_lead_insights_count || 0
          const resetDate = profile.ai_lead_insights_reset_date
          
          // If reset date is more than 30 days ago, reset the count
          if (resetDate) {
            const reset = new Date(resetDate)
            const now = new Date()
            const daysSinceReset = Math.floor((now.getTime() - reset.getTime()) / (1000 * 60 * 60 * 24))
            if (daysSinceReset > 30) {
              setRemaining(plan === 'enterprise' ? 100 : (plan === 'pro' ? 5 : 0))
            } else {
              // Within 30 days, calculate remaining
              const limit = plan === 'enterprise' ? 100 : (plan === 'pro' ? 5 : 0)
              setRemaining(Math.max(0, limit - used))
            }
          } else {
            // No reset date, use full limit minus used
            const limit = plan === 'enterprise' ? 100 : (plan === 'pro' ? 5 : 0)
            setRemaining(Math.max(0, limit - used))
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('[useGrowthOpportunities] Error loading cached opportunities:', err)
        setError(null) // Don't show error during initial load
        setLoading(false)
      }
    }

    loadCachedOpportunities()
  }, [clientId])

  const generateOpportunities = async () => {
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

      const response = await fetch(`/api/clients/${clientId}/growth-opportunities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}))
        
        // Check if it's a rate limit error vs plan gating
        if (errorData.remaining === 0 || errorData.error?.includes('limit')) {
          // Rate limit reached
          setRemaining(0)
          setError(errorData.error || 'Monthly limit reached')
        } else {
          // Plan gating
          setIsLocked(true)
          setError(null)
        }
        
        setData(null)
        setLoading(false)
        console.log('[useGrowthOpportunities] 403 error:', errorData.error)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to generate opportunities')
        setData(null)
        setLoading(false)
        return
      }

      const result = await response.json()
      setData(result)
      setIsFresh(true)
      
      // Update remaining count from response if provided
      if (result.remaining !== undefined) {
        setRemaining(result.remaining)
      }

      console.log('[useGrowthOpportunities] Generated opportunities for client', clientId)
    } catch (err) {
      console.error('[useGrowthOpportunities] Error:', err)
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
    generateOpportunities
  }
}
