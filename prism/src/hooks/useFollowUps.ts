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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchFollowUps = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch('/api/follow-ups', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      if (response.status === 403) {
        setError('Follow-up suggestions require Pro plan or higher')
        setFollowUps([])
        setCount(0)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to fetch follow-ups')
        setLoading(false)
        return
      }

      const data = await response.json()
      setFollowUps(data.follow_ups || [])
      setCount(data.follow_ups?.length || 0)

      console.log('[useFollowUps] Fetched', data.follow_ups?.length, 'follow-ups')
    } catch (err) {
      console.error('[useFollowUps] Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
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
    fetchFollowUps,
    getCount,
    updateFollowUp
  }
}
