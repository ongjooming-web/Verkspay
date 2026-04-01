import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Note {
  id: string
  content: string
  created_at: string
  updated_at: string
}

export function useClientNotes(clientId: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientNotes = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/clients/${clientId}/notes`, {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to fetch notes')
        setLoading(false)
        return
      }

      setNotes(data.notes || [])
    } catch (err) {
      console.error('[useClientNotes] Error fetching notes:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const addNote = async (content: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/clients/${clientId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add note')
      }

      setNotes([data, ...notes])
      return data
    } catch (err) {
      console.error('[useClientNotes] Error adding note:', err)
      throw err
    }
  }

  const updateNote = async (noteId: string, content: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update note')
      }

      setNotes(notes.map((note) => (note.id === noteId ? data : note)))
      return data
    } catch (err) {
      console.error('[useClientNotes] Error updating note:', err)
      throw err
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/clients/${clientId}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete note')
      }

      setNotes(notes.filter((note) => note.id !== noteId))
    } catch (err) {
      console.error('[useClientNotes] Error deleting note:', err)
      throw err
    }
  }

  useEffect(() => {
    if (clientId) {
      fetchClientNotes()
    }
  }, [clientId])

  return {
    notes,
    loading,
    error,
    fetchClientNotes,
    addNote,
    updateNote,
    deleteNote
  }
}
