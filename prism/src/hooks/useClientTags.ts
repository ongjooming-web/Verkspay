import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

export function useClientTags(clientId: string) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientTags = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/clients/${clientId}/tags`, {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to fetch tags')
        setLoading(false)
        return
      }

      setTags(data.tags || [])
    } catch (err) {
      console.error('[useClientTags] Error fetching tags:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const assignTags = async (tag_ids: string[]) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/clients/${clientId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag_ids })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign tags')
      }

      setTags(data.tags || [])
      return data.tags
    } catch (err) {
      console.error('[useClientTags] Error assigning tags:', err)
      throw err
    }
  }

  useEffect(() => {
    if (clientId) {
      fetchClientTags()
    }
  }, [clientId])

  return {
    tags,
    loading,
    error,
    fetchClientTags,
    assignTags
  }
}
