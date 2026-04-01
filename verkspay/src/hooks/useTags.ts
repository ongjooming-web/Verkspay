import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { seedDefaultTags } from '@/utils/seed-default-tags'

interface Tag {
  id: string
  name: string
  color: string
  created_at: string
  client_count?: number
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Seed default tags if user has none
      await seedDefaultTags(sessionData.session.user.id, supabase)

      const response = await fetch('/api/tags', {
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
      console.error('[useTags] Error fetching tags:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createTag = async (name: string, color: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, color })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tag')
      }

      setTags([...tags, data])
      return data
    } catch (err) {
      console.error('[useTags] Error creating tag:', err)
      throw err
    }
  }

  const updateTag = async (id: string, name?: string, color?: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, color })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tag')
      }

      setTags(tags.map((tag) => (tag.id === id ? { ...tag, ...data } : tag)))
      return data
    } catch (err) {
      console.error('[useTags] Error updating tag:', err)
      throw err
    }
  }

  const deleteTag = async (id: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete tag')
      }

      setTags(tags.filter((tag) => tag.id !== id))
    } catch (err) {
      console.error('[useTags] Error deleting tag:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag
  }
}
