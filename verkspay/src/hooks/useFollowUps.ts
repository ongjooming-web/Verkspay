import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface FollowUp {
  id: string
  client_id: string
  client_name: string
  suggestion: string
  reason: string
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

export function useFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [isLocked, setIsLocked] = useState(false)

  const fetchFollowUps = async () => {
    try {
      setLoading(true)
      setError(null)
      setIsLocked(false)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setFollowUps([])
        setCount(0)
        setLoading(false)
        return
      }

      // Step 1: Check plan BEFORE fetching
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, email')
        .eq('id', sessionData.session.user.id)
        .single()

      const plan = profileData?.plan || 'trial'
      const email = profileData?.email || ''
      const masterTestEmails = (process.env.NEXT_PUBLIC_MASTER_TEST_EMAILS || '').split(',')
      const isMaster = masterTestEmails.includes(email)

      // Trial/Starter: lock immediately, don't fetch
      if (!isMaster && (plan === 'trial' || plan === 'starter')) {
        console.log('[useFollowUps] Plan locked:', plan)
        setIsLocked(true)
        setFollowUps([])
        setCount(0)
        setLoading(false)
        return
      }

      // Step 2: Fetch if plan allows it
      const response = await fetch('/api/follow-ups', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      if (response.status === 403) {
        // Gracefully handle any remaining 403 responses
        setIsLocked(true)
        setError(null)
        setFollowUps([])
        setCount(0)
        setLoading(false)
        console.log('[useFollowUps] Feature locked (requires Pro plan)')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to fetch follow-ups')
        setFollowUps([])
        setCount(0)
        setLoading(false)
        return
      }

      const data = await response.json()

      // Validate response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response data')
      }

      const followUpsArray = Array.isArray(data.follow_ups) ? data.follow_ups : []
      setFollowUps(followUpsArray)
      setCount(followUpsArray.length)

      console.log('[useFollowUps] Fetched', followUpsArray.length, 'follow-ups')
    } catch (err) {
      console.error('[useFollowUps] Error:', err)
      setError('Something went wrong. Please try again.')
      setFollowUps([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }

  const getCount = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) return

      const response = await fetch('/api/follow-ups/count', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCount(data.count || 0)
      }
    } catch (err) {
      console.error('[useFollowUps Count] Error:', err)
    }
  }

  const updateFollowUp = async (id: string, status: 'pending' | 'dismissed' | 'actioned') => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) return

      const response = await fetch(`/api/follow-ups/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to update follow-up')
        return
      }

      // Remove from local list if dismissed or actioned
      if (status !== 'pending') {
        setFollowUps(followUps.filter((fu) => fu.id !== id))
      }

      console.log('[useFollowUps] Updated follow-up', id, 'to status', status)

      // Refresh count
      getCount()
    } catch (err) {
      console.error('[useFollowUps] Error updating:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  useEffect(() => {
    fetchFollowUps()
  }, [])

  return {
    followUps,
    loading,
    error,
    count,
    isLocked,
    fetchFollowUps,
    getCount,
    updateFollowUp
  }
}
