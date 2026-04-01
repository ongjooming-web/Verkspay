import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify token and get user
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = data.user.id

    // Fetch all proposals for user
    const { data: proposalsData, error: proposalsError } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', userId)

    if (proposalsError) {
      console.error('[ProposalStats] Error fetching proposals:', proposalsError)
      return NextResponse.json(
        { error: 'Failed to fetch proposals' },
        { status: 400 }
      )
    }

    const proposals = proposalsData || []

    // Calculate stats
    const stats = {
      total: proposals.length,
      draft: proposals.filter((p: any) => p.status === 'draft').length,
      sent: proposals.filter((p: any) => p.status === 'sent').length,
      viewed: proposals.filter((p: any) => p.status === 'viewed').length,
      accepted: proposals.filter((p: any) => p.status === 'accepted').length,
      declined: proposals.filter((p: any) => p.status === 'declined').length,
      pipelineValue: proposals
        .filter((p: any) => p.status === 'draft' || p.status === 'sent' || p.status === 'viewed')
        .reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
      acceptedValue: proposals
        .filter((p: any) => p.status === 'accepted')
        .reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
      winRate: proposals.length > 0 
        ? Math.round((proposals.filter((p: any) => p.status === 'accepted').length / proposals.length) * 100)
        : 0
    }

    console.log('[ProposalStats]', { userId, stats })

    return NextResponse.json(stats)
  } catch (err) {
    console.error('[ProposalStats] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
