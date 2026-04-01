import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/clients/[id]/tags - Get tags for a specific client
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

    // Get tags for this client
    const { data: assignments, error: assignError } = await supabase
      .from('client_tag_assignments')
      .select(`
        tag_id,
        client_tags!inner(id, name, color, created_at)
      `)
      .eq('client_id', id)
      .order('assigned_at', { ascending: false })

    if (assignError) {
      console.error('[ClientTags] Error fetching tags:', assignError)
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
    }

    const tags = (assignments || []).map((a: any) => ({
      id: a.client_tags.id,
      name: a.client_tags.name,
      color: a.client_tags.color,
      created_at: a.client_tags.created_at
    }))

    return NextResponse.json({ tags })
  } catch (err) {
    console.error('[ClientTags] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clients/[id]/tags - Assign tags to a client (upsert - replaces all assignments)
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
    const { tag_ids } = body

    if (!Array.isArray(tag_ids)) {
      return NextResponse.json({ error: 'tag_ids must be an array' }, { status: 400 })
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

    // Verify all tag_ids belong to this user
    if (tag_ids.length > 0) {
      const { data: validTags, error: tagError } = await supabase
        .from('client_tags')
        .select('id')
        .eq('user_id', userId)
        .in('id', tag_ids)

      if (tagError || (validTags || []).length !== tag_ids.length) {
        return NextResponse.json({ error: 'Invalid tag IDs' }, { status: 400 })
      }
    }

    // Delete existing assignments
    const { error: deleteError } = await supabase
      .from('client_tag_assignments')
      .delete()
      .eq('client_id', id)

    if (deleteError) {
      console.error('[ClientTags] Error deleting assignments:', deleteError)
      return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 })
    }

    // Insert new assignments
    if (tag_ids.length > 0) {
      const newAssignments = tag_ids.map((tagId: string) => ({
        client_id: id,
        tag_id: tagId
      }))

      const { error: insertError } = await supabase
        .from('client_tag_assignments')
        .insert(newAssignments)

      if (insertError) {
        console.error('[ClientTags] Error inserting assignments:', insertError)
        return NextResponse.json({ error: 'Failed to assign tags' }, { status: 500 })
      }
    }

    // Return updated tags
    const { data: assignments, error: fetchError } = await supabase
      .from('client_tag_assignments')
      .select(`
        client_tags!inner(id, name, color, created_at)
      `)
      .eq('client_id', id)

    if (fetchError) {
      console.error('[ClientTags] Error fetching updated tags:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
    }

    const tags = (assignments || []).map((a: any) => ({
      id: a.client_tags.id,
      name: a.client_tags.name,
      color: a.client_tags.color,
      created_at: a.client_tags.created_at
    }))

    return NextResponse.json({ tags })
  } catch (err) {
    console.error('[ClientTags] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
