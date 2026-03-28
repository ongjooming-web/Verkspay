'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import type { ClaudeInsights, InsightsResponse } from '@/app/api/insights/generate/route'

export default function InsightsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [insights, setInsights] = useState<ClaudeInsights | null>(null)
  const [usage, setUsage] = useState<{ used: number; limit: number; plan: string } | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'trial_expired' | 'rate_limit' | 'api_error' | null>(null)
  const [token, setToken] = useState<string>('')

  // Auth check & load saved insights
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) {
          router.push('/login')
          return
        }

        setUser(data.session.user)
        setToken(data.session.access_token)

        // Load saved insights
        try {
          const response = await fetch('/api/insights/latest', {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          })
          const data_: any = await response.json()
          if (data_.insights) {
            setInsights(data_.insights)
            setUsage(data_.usage)
            setGeneratedAt(data_.generated_at)
          }
        } catch (err) {
          console.error('Failed to load saved insights:', err)
        }
      } catch (err) {
        console.error('Auth error:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const downloadPDF = async () => {
    if (!token || !insights) return

    try {
      // Fetch the HTML from the PDF endpoint
      const response = await fetch('/api/insights/pdf', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.error('PDF generation failed:', response.status)
        setError('Failed to generate PDF')
        return
      }

      const html = await response.text()

      // Create a container for html2pdf
      const element = document.createElement('div')
      element.innerHTML = html

      // Use html2pdf via a script tag (load from CDN)
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = () => {
        // @ts-ignore - html2pdf is now globally available
        const opt = {
          margin: 10,
          filename: `business-insights-${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        }
        // @ts-ignore
        html2pdf().set(opt).from(element).save()
      }
      script.onerror = () => {
        console.error('Failed to load html2pdf library')
        setError('Failed to load PDF library. Please try again.')
      }
      document.head.appendChild(script)
    } catch (err) {
      console.error('Error downloading PDF:', err)
      setError('An error occurred while generating the PDF')
    }
  }

  const generateInsights = async () => {
    if (!token) return

    setGenerating(true)
    setError(null)
    setErrorType(null)

    try {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.error === 'trial_expired') {
          setErrorType('trial_expired')
          setError('Your 15-day trial has ended. Choose a plan to continue.')
        } else if (response.status === 429 && data.error === 'rate_limit') {
          setErrorType('rate_limit')
          const resetDate = new Date(data.resets_at).toLocaleDateString()
          setError(`You've used all ${data.limit} insights this month. Resets on ${resetDate}.`)
        } else {
          setErrorType('api_error')
          setError(data.message || 'Failed to generate insights.')
        }
        return
      }

      const result = data as InsightsResponse
      setInsights(result.insights)
      setUsage(result.usage)
      setGeneratedAt(new Date().toISOString())
    } catch (err) {
      console.error('Generate error:', err)
      setErrorType('api_error')
      setError('An error occurred. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
            ✨ Business Insights
          </h1>
          <p className="text-gray-400">AI-powered analysis of your business data</p>
        </div>

        {/* Tip Banner */}
        <Card className="mb-8 border-blue-500/30 bg-blue-500/5">
          <CardBody>
            <div className="flex items-start gap-3">
              <div className="text-blue-400 text-xl mt-0.5">💡</div>
              <div>
                <p className="text-blue-300 font-semibold text-sm mb-1">Pro Tip: Add industry to your clients</p>
                <p className="text-gray-400 text-sm">Including industry information helps AI provide better insights, spot opportunities across sectors, and identify industry-specific trends.</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button
              onClick={generateInsights}
              disabled={generating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
            >
              {generating ? 'Analyzing...' : 'Generate Insights'}
            </Button>
            {insights && (
              <Button
                onClick={downloadPDF}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg"
              >
                📄 Download PDF
              </Button>
            )}
            {usage && (
              <div className="text-sm text-gray-400">
                <span className="text-white font-semibold">{usage.used}</span> of{' '}
                <span className="text-white font-semibold">{usage.limit === 100 && usage.plan === 'enterprise' ? usage.limit : usage.limit}</span> used this month
              </div>
            )}
          </div>
        </div>
        {generatedAt && (
          <div className="text-xs text-gray-500 mb-8">
            Last generated: {new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Loading State */}
        {generating && (
          <Card className="mb-8 border-blue-500/30">
            <CardBody>
              <div className="flex items-center justify-center gap-3 py-8">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                <span className="text-white">Analyzing your data...</span>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Error States */}
        {error && (
          <Card className="mb-8 border-red-500/30 bg-red-500/10">
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-red-400 font-semibold mb-1">
                    {errorType === 'trial_expired' && '⏰ Trial Ended'}
                    {errorType === 'rate_limit' && '📊 Limit Reached'}
                    {errorType === 'api_error' && '❌ Error'}
                  </h3>
                  <p className="text-gray-300">{error}</p>
                </div>
                <div>
                  {errorType === 'trial_expired' && (
                    <Link href="/pricing">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        View Plans
                      </Button>
                    </Link>
                  )}
                  {errorType === 'rate_limit' && (
                    <Link href="/pricing">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        Upgrade
                      </Button>
                    </Link>
                  )}
                  {errorType === 'api_error' && (
                    <Button
                      onClick={generateInsights}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Empty State */}
        {!insights && !error && !generating && (
          <Card className="mb-8 border-blue-500/30">
            <CardBody>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">✨</div>
                <p className="text-gray-300 text-lg">
                  Click "Generate Insights" to get an AI-powered analysis of your invoicing data
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Results */}
        {insights && (
          <>
            {/* Executive Summary */}
            <Card className="mb-6 border-blue-500/30">
              <CardHeader>
                <h2 className="text-2xl font-bold text-white">Executive Summary</h2>
              </CardHeader>
              <CardBody>
                <p className="text-gray-300 mb-4">{insights.summary}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Revenue Trend:</span>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      insights.revenue_trend === 'growing'
                        ? 'bg-green-500/20 text-green-400'
                        : insights.revenue_trend === 'stable'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {insights.revenue_trend === 'growing' && '📈 Growing'}
                    {insights.revenue_trend === 'stable' && '➡️ Stable'}
                    {insights.revenue_trend === 'declining' && '📉 Declining'}
                  </span>
                </div>
              </CardBody>
            </Card>

            {/* Highlights */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">Highlights</h2>
              <div className="grid gap-4">
                {insights.highlights.map((highlight, idx) => {
                  const borderColor =
                    highlight.type === 'positive'
                      ? 'border-green-500/50'
                      : highlight.type === 'warning'
                        ? 'border-yellow-500/50'
                        : 'border-orange-500/50'
                  const icon =
                    highlight.type === 'positive'
                      ? '✓'
                      : highlight.type === 'warning'
                        ? '⚠️'
                        : '→'

                  return (
                    <Card key={idx} className={`border-l-4 ${borderColor}`}>
                      <CardBody>
                        <div className="flex gap-3">
                          <div className="text-lg flex-shrink-0">{icon}</div>
                          <div>
                            <h3 className="text-white font-semibold mb-1">{highlight.title}</h3>
                            <p className="text-gray-400">{highlight.description}</p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Client Health */}
            {insights.client_insights.length > 0 && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-4">Client Health</h2>
                <Card className="border-blue-500/30">
                  <CardBody>
                    <div className="space-y-3">
                      {insights.client_insights.map((client, idx) => {
                        const healthColor =
                          client.health === 'good'
                            ? 'bg-green-500/20 text-green-400'
                            : client.health === 'attention'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                        const healthDot =
                          client.health === 'good' ? '🟢' : client.health === 'attention' ? '🟡' : '🔴'

                        return (
                          <div key={idx} className="flex items-start justify-between p-3 rounded bg-gray-900/50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{healthDot}</span>
                                <h3 className="text-white font-semibold">{client.client_name}</h3>
                              </div>
                              <p className="text-gray-400 text-sm mt-1">{client.note}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${healthColor}`}>
                              {client.health}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-4">Recommendations</h2>
                <Card className="border-blue-500/30">
                  <CardBody>
                    <ol className="space-y-3 list-decimal list-inside">
                      {insights.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-gray-300">
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </CardBody>
                </Card>
              </div>
            )}
          </>
        )}


      </div>
    </div>
  )
}
