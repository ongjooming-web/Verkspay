'use client'

import { useFollowUps } from '@/hooks/useFollowUps'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

export function FollowUpsWidget() {
  const { followUps, loading, error, updateFollowUp } = useFollowUps()

  if (error && error.includes('Pro plan')) {
    return (
      <Card className="border-gray-700/50">
        <CardHeader>
          <h3 className="text-lg font-bold text-white">📋 Follow-up Suggestions</h3>
        </CardHeader>
        <CardBody>
          <p className="text-gray-400 text-sm">
            Follow-up suggestions require <span className="font-semibold text-blue-400">Pro plan</span> or higher
          </p>
        </CardBody>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-gray-700/50">
        <CardHeader>
          <h3 className="text-lg font-bold text-white">📋 Follow-up Suggestions</h3>
        </CardHeader>
        <CardBody>
          <div className="text-gray-400 text-sm">Loading suggestions...</div>
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-gray-700/50">
        <CardHeader>
          <h3 className="text-lg font-bold text-white">📋 Follow-up Suggestions</h3>
        </CardHeader>
        <CardBody>
          <div className="text-red-400 text-sm">{error}</div>
        </CardBody>
      </Card>
    )
  }

  if (!followUps || followUps.length === 0) {
    return (
      <Card className="border-gray-700/50">
        <CardHeader>
          <h3 className="text-lg font-bold text-white">📋 Follow-up Suggestions</h3>
        </CardHeader>
        <CardBody>
          <p className="text-gray-400 text-sm">All caught up! No follow-ups needed right now.</p>
        </CardBody>
      </Card>
    )
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'low':
        return 'bg-blue-500/20 text-blue-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴'
      case 'medium':
        return '🟡'
      case 'low':
        return '🔵'
      default:
        return '⚪'
    }
  }

  return (
    <Card className="border-blue-500/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">📋 Follow-up Suggestions</h3>
          <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-semibold">
            {followUps.length} {followUps.length === 1 ? 'action' : 'actions'}
          </span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-2 md:space-y-3">
          {followUps.slice(0, 5).map((followUp) => (
            <div key={followUp.id} className="p-3 md:p-4 bg-gray-900/50 rounded-lg hover:bg-gray-800/50 transition">
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm md:text-base truncate">
                      {followUp.client_name}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded whitespace-nowrap font-semibold ${getPriorityBadge(followUp.priority)}`}>
                    {getPriorityEmoji(followUp.priority)} {followUp.priority}
                  </span>
                </div>
              </div>

              <p className="text-gray-300 text-xs md:text-sm mb-3 leading-relaxed break-words">
                {followUp.suggestion}
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => updateFollowUp(followUp.id, 'actioned')}
                  className="flex-1 px-3 py-2 text-xs md:text-sm bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition"
                >
                  ✓ Done
                </button>
                <button
                  onClick={() => updateFollowUp(followUp.id, 'dismissed')}
                  className="flex-1 px-3 py-2 text-xs md:text-sm bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition"
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>

        {followUps.length > 5 && (
          <Link href="/follow-ups" className="block mt-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-sm">
              View All {followUps.length} Suggestions →
            </Button>
          </Link>
        )}
      </CardBody>
    </Card>
  )
}
