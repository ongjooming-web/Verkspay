import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT /api/clients/[id]/notes/[noteId] - Edit a note
export async function PUT(request: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data, error: authError } = await supabase.auth.getUser(token)

    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = data.user.id
    const clientId = params.id
    const noteId = params.noteId
    const body = await request.json()
    const { content } = body

    // Validation
    if (!content || !content.toString().trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    if (content.toString().trim().length > 2000) {
      return NextResponse.json({ error: 'Note must be 2000 characters or less' }, { status: 400 })
    }

    // Verify note ownership
    const { data: existingNote, error: fetchError } = await supabase
      .from('client_notes')
      .select('id, client_id')
      .eq('id', noteId)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .single()

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Update note
    const { data: updatedNote, error: updateError } = await supabase
      .from('client_notes')
      .update({
        content: content.toString().trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('[ClientNotes] Error updating note:', updateError)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    return NextResponse.json({
      id: updatedNote.id,
      content: updatedNote.content,
      created_at: updatedNote.created_at,
      updated_at: updatedNote.updated_at
    })
  } catch (err) {
    console.error('[ClientNotes] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/clients/[id]/notes/[noteId] - Delete a note
export async function DELETE(request: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data, error: authError } = await supabase.auth.getUser(token)

    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = data.user.id
    const clientId = params.id
    const noteId = params.noteId

    // Verify note ownership
    const { data: existingNote, error: fetchError } = await supabase
      .from('client_notes')
      .select('id, client_id')
      .eq('id', noteId)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .single()

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Delete note
    const { error: deleteError } = await supabase
      .from('client_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[ClientNotes] Error deleting note:', deleteError)
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ClientNotes] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
