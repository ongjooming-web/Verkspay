'use client'

import { useRevenueForecast } from '@/hooks/useRevenueForecast'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { useCurrency } from '@/hooks/useCurrency'

export function RevenueForecastWidget() {
  const { data, loading, error, isAvailable } = useRevenueForecast()
  const { currencyCode } = useCurrency()

  if (!isAvailable) {
    return (
      <Card className="border-gray-700/50">
        <CardHeader>
          <h3 className="text-lg font-bold text-white">📊 Revenue Forecast</h3>
        </CardHeader>
        <CardBody>
          <p className="text-gray-400 text-sm">
            Revenue forecasting requires <span className="font-semibold text-blue-400">Enterprise plan</span>
          </p>
        </CardBody>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-gray-700/50">
        <CardHeader>
          <h3 className="text-lg font-bold text-white">📊 Revenue Forecast</h3>
        </CardHeader>
        <CardBody>
          <div className="text-gray-400 text-sm">Loading forecast...</div>
        </CardBody>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-gray-700/50">
        <CardHeader>
          <h3 className="text-lg font-bold text-white">📊 Revenue Forecast</h3>
        </CardHeader>
        <CardBody>
          <div className="text-red-400 text-sm">{error || 'Failed to load forecast'}</div>
        </CardBody>
      </Card>
    )
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return { color: 'bg-green-500/20 text-green-400', label: '🎯 High' }
      case 'medium':
        return { color: 'bg-yellow-500/20 text-yellow-400', label: '📊 Medium' }
      case 'low':
        return { color: 'bg-orange-500/20 text-orange-400', label: '⚠️ Low' }
      default:
        return { color: 'bg-gray-500/20 text-gray-400', label: 'Unknown' }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD'
    }).format(amount)
  }

  return (
    <Card className="border-blue-500/30">
      <CardHeader>
        <h3 className="text-lg font-bold text-white">📊 Revenue Forecast</h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          {/* 30-day forecast */}
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-white font-semibold">30-Day Forecast</h4>
              <span className={`text-xs px-2 py-1 rounded ${getConfidenceBadge(data.period_30_days.confidence).color}`}>
                {getConfidenceBadge(data.period_30_days.confidence).label}
              </span>
            </div>
            <p className="text-3xl font-bold text-green-400 mb-3">
              {formatCurrency(data.period_30_days.total)}
            </p>
            <div className="space-y-1 text-sm text-gray-400">
              {data.period_30_days.breakdown.recurring > 0 && (
                <div className="flex justify-between">
                  <span>Recurring:</span>
                  <span className="text-white">{formatCurrency(data.period_30_days.breakdown.recurring)}</span>
                </div>
              )}
              {data.period_30_days.breakdown.outstanding > 0 && (
                <div className="flex justify-between">
                  <span>Expected Payments:</span>
                  <span className="text-white">{formatCurrency(data.period_30_days.breakdown.outstanding)}</span>
                </div>
              )}
              {data.period_30_days.breakdown.trend > 0 && (
                <div className="flex justify-between">
                  <span>Trend Projection:</span>
                  <span className="text-white">{formatCurrency(data.period_30_days.breakdown.trend)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 60-day forecast */}
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-white font-semibold">60-Day Forecast</h4>
              <span className={`text-xs px-2 py-1 rounded ${getConfidenceBadge(data.period_60_days.confidence).color}`}>
                {getConfidenceBadge(data.period_60_days.confidence).label}
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-400 mb-3">
              {formatCurrency(data.period_60_days.total)}
            </p>
          </div>

          {/* 90-day forecast */}
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-white font-semibold">90-Day Forecast</h4>
              <span className={`text-xs px-2 py-1 rounded ${getConfidenceBadge(data.period_90_days.confidence).color}`}>
                {getConfidenceBadge(data.period_90_days.confidence).label}
              </span>
            </div>
            <p className="text-3xl font-bold text-purple-400 mb-3">
              {formatCurrency(data.period_90_days.total)}
            </p>
          </div>

          {/* Notes */}
          {data.period_30_days.notes.length > 0 && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300">
              <p className="font-semibold mb-2">ℹ️ How this forecast was calculated:</p>
              <ul className="space-y-1 text-xs">
                {data.period_30_days.notes.map((note, idx) => (
                  <li key={idx}>• {note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
