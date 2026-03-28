import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { status } = await request.json()

    // Validate status
    if (!['pending', 'dismissed', 'actioned'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify ownership
    const { data: followUp, error: fetchError } = await supabase
      .from('client_follow_ups')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !followUp) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    // Update status
    const updateData: any = { status }
    if (status === 'actioned') {
      updateData.actioned_at = new Date().toISOString()
    }

    const { data: updated, error: updateError } = await supabase
      .from('client_follow_ups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[FollowUps] Error updating:', updateError)
      return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 })
    }

    console.log('[FollowUps] Updated follow-up', id, 'to status', status)

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[FollowUps] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
