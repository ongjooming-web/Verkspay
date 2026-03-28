'use client'

import { useState, useEffect, useRef } from 'react'
import { useFollowUps } from '@/hooks/useFollowUps'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function FollowUpsWidget() {
  const { followUps, loading, error, updateFollowUp, isLocked } = useFollowUps()
  const [expandAll, setExpandAll] = useState(false)
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debug logging
  useEffect(() => {
    console.log('[FollowUpsWidget] Data:', JSON.stringify({ 
      followUpsCount: followUps?.length,
      followUpsArray: followUps,
      loading,
      error,
      isLocked 
    }))
  }, [followUps, loading, error, isLocked])

  // Locked state (Pro+ only)
  if (isLocked) {
    return (
      <Card className="border-gray-700/50">
        <CardHeader>
          <h3 className="text-lg font-bold text-white">📋 Follow-up Suggestions</h3>
        </CardHeader>
        <CardBody>
          <p className="text-gray-400 text-sm mb-4">
            Get smart follow-up suggestions based on client payment patterns and activity.
          </p>
          <p className="text-gray-400 text-sm">
            This feature requires <span className="font-semibold text-blue-400">Pro plan</span> or higher
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
          <p className="text-gray-400 text-sm">✓ All caught up! No follow-ups needed right now.</p>
        </CardBody>
      </Card>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Handle click outside tooltip
  useEffect(() => {
    if (!showTooltip) return

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showTooltip])

  // Safely handle followUps array
  const safeFollowUps = Array.isArray(followUps) ? followUps.filter(fu => fu && typeof fu === 'object') : []
  const displayedFollowUps = expandAll ? safeFollowUps : safeFollowUps.slice(0, 5)
  const hasMore = safeFollowUps.length > 5 && !expandAll

  return (
    <Card className="border-gray-700/50">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">📋 Follow-up Suggestions</h3>
          <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-semibold">
            {safeFollowUps.length} {safeFollowUps.length === 1 ? 'action' : 'actions'}
          </span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="divide-y divide-gray-700/50">
          {displayedFollowUps.map((followUp) => {
            // Defensive null check
            if (!followUp || !followUp.id) {
              console.warn('[FollowUpsWidget] Invalid follow-up item:', followUp)
              return null
            }

            return (
              <div
                key={followUp?.id || Math.random()}
                className="py-3 px-4 flex items-center gap-3 hover:bg-white/5 transition group relative"
              >
                {/* Priority Dot */}
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(followUp?.priority || 'low')}`}
                  title={`Priority: ${followUp?.priority || 'low'}`}
                />

                {/* Client Name + Suggestion */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        if (followUp?.client_id) {
                          router.push(`/clients/${followUp.client_id}`)
                        }
                      }}
                      className="font-semibold text-white hover:text-blue-400 transition truncate"
                    >
                      {followUp?.client_name || 'Unknown Client'}
                    </button>
                    <p
                      className="text-gray-400 text-sm truncate md:text-clip flex-1 cursor-help"
                      onMouseEnter={() => followUp?.id && setShowTooltip(followUp.id)}
                      onMouseLeave={() => setShowTooltip(null)}
                      onClick={() => followUp?.id && setShowTooltip(showTooltip === followUp.id ? null : followUp.id)}
                    >
                      {followUp?.suggestion || 'No suggestion text'}
                    </p>
                  </div>

                  {/* Tooltip on hover/tap */}
                  {followUp?.id && showTooltip === followUp.id && (
                    <div
                      ref={tooltipRef}
                      className="absolute left-0 top-full mt-2 z-50 bg-gray-900 border border-gray-700 rounded-lg p-3 max-w-xs text-xs text-gray-300 shadow-lg"
                    >
                      {followUp?.suggestion || 'No suggestion text'}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => followUp?.id && updateFollowUp(followUp.id, 'actioned')}
                    className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-green-500 hover:bg-green-500/10 rounded transition"
                    title="Mark as done"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => followUp?.id && updateFollowUp(followUp.id, 'dismissed')}
                    className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-gray-500 hover:bg-gray-500/10 rounded transition"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* View All button */}
        {hasMore && (
          <button
            onClick={() => setExpandAll(true)}
            className="w-full py-3 px-4 text-sm text-blue-400 hover:text-blue-300 transition mt-2"
          >
            View all {safeFollowUps.length} suggestions →
          </button>
        )}
      </CardBody>
    </Card>
  )
}
