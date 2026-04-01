import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/clients/[id]/notes - List notes for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get notes for this client
    const { data: notes, error: notesError } = await supabase
      .from('client_notes')
      .select('id, content, created_at, updated_at')
      .eq('client_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('[ClientNotes] Error fetching notes:', notesError)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    return NextResponse.json({ notes: notes || [] })
  } catch (err) {
    console.error('[ClientNotes] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clients/[id]/notes - Add a note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    const body = await request.json()
    const { content } = body

    // Validation
    if (!content || !content.toString().trim()) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    if (content.toString().trim().length > 2000) {
      return NextResponse.json({ error: 'Note must be 2000 characters or less' }, { status: 400 })
    }

    // Verify client ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Create note
    const { data: newNote, error: createError } = await supabase
      .from('client_notes')
      .insert([{
        client_id: id,
        user_id: userId,
        content: content.toString().trim()
      }])
      .select()
      .single()

    if (createError) {
      console.error('[ClientNotes] Error creating note:', createError)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json({
      id: newNote.id,
      content: newNote.content,
      created_at: newNote.created_at,
      updated_at: newNote.updated_at
    }, { status: 201 })
  } catch (err) {
    console.error('[ClientNotes] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
