import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autoTagAllClients } from '@/lib/auto-tag'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
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

    // Use shared auto-tag utility
    await autoTagAllClients(userId)

    console.log('[AutoTag] Manual auto-tag triggered for user', userId)

    return NextResponse.json({
      success: true,
      message: 'Auto-tagging completed'
    })
  } catch (err) {
    console.error('[AutoTag] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
