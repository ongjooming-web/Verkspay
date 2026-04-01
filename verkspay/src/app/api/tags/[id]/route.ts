import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT /api/tags/[id] - Update a tag
export async function PUT(
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
    const { name, color } = body

    // Verify tag ownership
    const { data: existingTag, error: fetchError } = await supabase
      .from('client_tags')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Prepare update object
    const updateData: any = {}

    if (name !== undefined) {
      if (!name || !name.toString().trim()) {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
      }
      if (name.toString().trim().length > 30) {
        return NextResponse.json({ error: 'Tag name must be 30 characters or less' }, { status: 400 })
      }
      updateData.name = name.toString().trim()
    }

    if (color !== undefined) {
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return NextResponse.json({ error: 'Invalid color format (must be hex like #FF0000)' }, { status: 400 })
      }
      updateData.color = color.toUpperCase()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update tag
    const { data: updatedTag, error: updateError } = await supabase
      .from('client_tags')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 })
      }
      console.error('[Tags] Error updating tag:', updateError)
      return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
    }

    return NextResponse.json({
      id: updatedTag.id,
      name: updatedTag.name,
      color: updatedTag.color,
      created_at: updatedTag.created_at
    })
  } catch (err) {
    console.error('[Tags] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/tags/[id] - Delete a tag (cascades assignments)
export async function DELETE(
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

    // Verify tag ownership
    const { data: existingTag, error: fetchError } = await supabase
      .from('client_tags')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Delete tag (cascades to assignments via FK)
    const { error: deleteError } = await supabase
      .from('client_tags')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[Tags] Error deleting tag:', deleteError)
      return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[Tags] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
