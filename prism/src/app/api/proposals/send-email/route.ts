import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const body = await request.json()
    const { proposalId } = body

    if (!proposalId) {
      return NextResponse.json({ error: 'Missing proposalId' }, { status: 400 })
    }

    // Fetch proposal with client details
    const { data: proposalData, error: proposalError } = await supabase
      .from('proposals')
      .select('*, clients(name, email)')
      .eq('id', proposalId)
      .eq('user_id', data.user.id)
      .single()

    if (proposalError || !proposalData) {
      console.error('[SendProposalEmail] Proposal not found:', proposalError)
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const clientEmail = proposalData.clients?.email
    if (!clientEmail) {
      console.error('[SendProposalEmail] Client has no email address')
      return NextResponse.json({ error: 'Client email not found' }, { status: 400 })
    }

    // Get user profile for sender info
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', data.user.id)
      .single()

    const senderEmail = profileData?.email || 'noreply@Verkspay.app'

    // Format proposal for email
    const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.Verkspayops.xyz'}/proposals/${proposalId}`
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937; margin-bottom: 20px;">New Proposal: ${proposalData.title}</h1>
        
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
          Hi ${proposalData.clients?.name},
        </p>

        <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
          We've prepared a proposal for your project. Please review the details below and let us know if you have any questions.
        </p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Proposal:</strong> ${proposalData.proposal_number}</p>
          <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> ${proposalData.currency_code} ${proposalData.total_amount.toFixed(2)}</p>
          ${proposalData.valid_until ? `<p style="margin: 0;"><strong>Valid Until:</strong> ${new Date(proposalData.valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>` : ''}
        </div>

        ${proposalData.summary ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin-bottom: 10px;">Summary</h3>
            <p style="color: #374151; line-height: 1.6;">${proposalData.summary}</p>
          </div>
        ` : ''}

        <div style="margin-bottom: 20px;">
          <a href="${proposalUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Full Proposal
          </a>
        </div>

        <p style="color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          Questions? Reply to this email or contact us directly.
        </p>
      </div>
    `

    // Send email via Resend
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `noreply@Verkspay.app`,
          to: clientEmail,
          subject: `Proposal: ${proposalData.title}`,
          html: emailHtml
        })
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('[SendProposalEmail] Resend error:', resendData)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }

      console.log('[SendProposalEmail] Email sent successfully:', {
        proposalId,
        clientEmail,
        resendId: resendData.id
      })

      return NextResponse.json({
        success: true,
        message: 'Proposal sent successfully',
        email: clientEmail
      })
    } catch (resendError) {
      console.error('[SendProposalEmail] Resend request error:', resendError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (err) {
    console.error('[SendProposalEmail] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
