import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ClaudeInsights } from '../generate/route'

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
    console.log('[Insights/PDF] Generating PDF for user:', userId)

    // Fetch user's profile with insights and business name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('latest_insights, insights_generated_at, business_name, full_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.latest_insights) {
      console.error('[Insights/PDF] Profile or insights not found')
      return NextResponse.json(
        { error: 'No insights found' },
        { status: 404 }
      )
    }

    const insights = profile.latest_insights as ClaudeInsights
    const businessName = profile.business_name || profile.full_name || 'Your Business'
    const generatedAt = new Date(profile.insights_generated_at)
    const dateStr = generatedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Generate HTML for PDF
    const html = generatePDFHTML(insights, businessName, dateStr)

    // Return as HTML that the client-side will convert to PDF
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Insights/PDF] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

function markdownToHtml(markdown: string): string {
  // Convert markdown to HTML
  let html = markdown
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|l|p])(.*?)$/gm, '<p>$1</p>')

  return html
}

function generatePDFHTML(insights: ClaudeInsights, businessName: string, generatedAt: string): string {
  const contentHtml = markdownToHtml(insights as string)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Insights Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: white;
      color: #333;
      line-height: 1.6;
      padding: 40px;
    }
    
    .container {
      max-width: 850px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 30px;
    }
    
    h1 {
      font-size: 32px;
      color: #1f2937;
      margin-bottom: 10px;
    }
    
    h2 {
      font-size: 24px;
      color: #1f2937;
      margin: 25px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    h3 {
      font-size: 18px;
      color: #1f2937;
      margin: 15px 0 10px 0;
    }
    
    p {
      margin-bottom: 15px;
      color: #374151;
      font-size: 15px;
    }
    
    ul {
      margin: 15px 0 15px 20px;
      list-style-type: disc;
    }
    
    li {
      margin-bottom: 8px;
      color: #374151;
    }
    
    strong {
      color: #1f2937;
      font-weight: 600;
    }
    
    .business-name {
      font-size: 20px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .generated-date {
      font-size: 14px;
      color: #9ca3af;
      margin-top: 10px;
    }
    
    footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <h1>Business Insights Report</h1>
      <div class="business-name">${businessName}</div>
      <div class="generated-date">Generated ${generatedAt}</div>
    </header>
    
    <!-- AI-Generated Content -->
    <section>
      ${contentHtml}
    </section>
    
    <!-- Footer -->
    <footer>
      <p>Generated by Prism - AI-powered business insights for freelancers</p>
    </footer>
  </div>
</body>
</html>
`
}
