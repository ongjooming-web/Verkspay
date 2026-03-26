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
    // This works with html2pdf.js library or browser's print-to-PDF feature
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

function generatePDFHTML(insights: ClaudeInsights, businessName: string, generatedAt: string): string {
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
    
    .logo {
      font-size: 36px;
      margin-bottom: 10px;
    }
    
    h1 {
      font-size: 32px;
      color: #1f2937;
      margin-bottom: 10px;
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
    
    section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    h2 {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .summary-box {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #3b82f6;
    }
    
    .summary-text {
      font-size: 16px;
      color: #374151;
      margin-bottom: 15px;
    }
    
    .trend-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
    }
    
    .trend-growing {
      background: #d1fae5;
      color: #065f46;
    }
    
    .trend-stable {
      background: #fef3c7;
      color: #92400e;
    }
    
    .trend-declining {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .highlights {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .highlight {
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid;
    }
    
    .highlight.positive {
      background: #f0fdf4;
      border-left-color: #22c55e;
    }
    
    .highlight.warning {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    
    .highlight.action {
      background: #fef2f2;
      border-left-color: #ef4444;
    }
    
    .highlight-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 5px;
    }
    
    .highlight-description {
      font-size: 14px;
      color: #4b5563;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #1f2937;
      border-bottom: 2px solid #d1d5db;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .health-good {
      color: #059669;
      font-weight: 600;
    }
    
    .health-attention {
      color: #d97706;
      font-weight: 600;
    }
    
    .health-at-risk {
      color: #dc2626;
      font-weight: 600;
    }
    
    .recommendations {
      list-style: none;
      counter-reset: rec-counter;
    }
    
    .recommendations li {
      counter-increment: rec-counter;
      padding-left: 30px;
      position: relative;
      margin-bottom: 12px;
      color: #374151;
      font-size: 15px;
    }
    
    .recommendations li::before {
      content: counter(rec-counter) ".";
      position: absolute;
      left: 0;
      font-weight: 600;
      color: #3b82f6;
    }
    
    footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">◆</div>
      <h1>Business Insights Report</h1>
      <div class="business-name">${businessName}</div>
      <div class="generated-date">Generated ${generatedAt}</div>
    </header>
    
    <!-- Executive Summary -->
    <section>
      <h2>Executive Summary</h2>
      <div class="summary-box">
        <p class="summary-text">${insights.summary}</p>
        <span class="trend-badge trend-${insights.revenue_trend}">
          ${insights.revenue_trend === 'growing' ? '📈 Growing' : insights.revenue_trend === 'stable' ? '➡️ Stable' : '📉 Declining'}
        </span>
      </div>
    </section>
    
    <!-- Highlights -->
    ${insights.highlights.length > 0 ? `
      <section>
        <h2>Key Highlights</h2>
        <div class="highlights">
          ${insights.highlights.map(h => `
            <div class="highlight ${h.type}">
              <div class="highlight-title">${h.title}</div>
              <div class="highlight-description">${h.description}</div>
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}
    
    <!-- Client Health -->
    ${insights.client_insights.length > 0 ? `
      <section>
        <h2>Client Health</h2>
        <table>
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Health Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${insights.client_insights.map(c => `
              <tr>
                <td>${c.client_name}</td>
                <td>
                  <span class="health-${c.health}">
                    ${c.health === 'good' ? '🟢 Good' : c.health === 'attention' ? '🟡 Attention' : '🔴 At Risk'}
                  </span>
                </td>
                <td>${c.note}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    ` : ''}
    
    <!-- Recommendations -->
    ${insights.recommendations.length > 0 ? `
      <section>
        <h2>Recommendations</h2>
        <ul class="recommendations">
          ${insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </section>
    ` : ''}
    
    <footer>
      Generated by Prism — Business Operations & Invoicing Platform<br>
      <a href="https://app.prismops.xyz" style="color: #6b7280; text-decoration: none;">prismops.xyz</a>
    </footer>
  </div>
  
  <script>
    // Auto-print on load (optional)
    // window.print();
  </script>
</body>
</html>
  `
}
