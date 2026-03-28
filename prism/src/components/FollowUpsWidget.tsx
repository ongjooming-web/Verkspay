'use client'

import { useFollowUps } from '@/hooks/useFollowUps'
import { Button } from '@/components/Button'
import { useRouter } from 'next/navigation'

export function FollowUpsWidget() {
  const { followUps, loading, error, isLocked, updateFollowUp } = useFollowUps()
  const router = useRouter()

  console.log('[FollowUpsWidget] Hook returns:', { followUps, loading, error, isLocked })

  // Guard 1: Loading
  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Follow-up Suggestions</h3>
        <p className="text-gray-400 text-sm">Loading suggestions...</p>
      </div>
    )
  }

  // Guard 2: Locked (Trial/Starter)
  if (isLocked) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Follow-up Suggestions</h3>
        <p className="text-gray-400 text-sm mb-4">Smart follow-up suggestions help you stay on top of client payments and engagement.</p>
        <p className="text-gray-500 text-sm mb-4">Upgrade to <span className="font-semibold text-blue-400">Pro</span> to get AI-powered follow-up reminders.</p>
        <Button
          onClick={() => router.push('/pricing')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
        >
          View Plans →
        </Button>
      </div>
    )
  }

  // Guard 3: Error
  if (error) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Follow-up Suggestions</h3>
        <p className="text-gray-400 text-sm mb-3">Unable to load suggestions.</p>
        <button
          onClick={() => window.location.reload()}
          className="text-purple-400 hover:text-purple-300 underline text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  // Guard 4: Safe array check
  const items = Array.isArray(followUps) ? followUps : []

  // Guard 5: Empty state
  if (items.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Follow-up Suggestions</h3>
        <p className="text-gray-400 text-sm">✓ All caught up! No follow-ups needed right now.</p>
      </div>
    )
  }

  // Render items only after ALL guards pass
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">📋 Follow-up Suggestions</h3>
        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full font-semibold">
          {items.length} {items.length === 1 ? 'action' : 'actions'}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          // Double-check each item
          if (!item || !item.id) {
            console.warn('[FollowUpsWidget] Skipping invalid item:', item)
            return null
          }

          const priority = item.priority || 'low'
          const priorityColor =
            priority === 'high'
              ? 'bg-red-500'
              : priority === 'medium'
                ? 'bg-yellow-500'
                : 'bg-gray-500'

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 py-3 px-3 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 rounded transition"
            >
              {/* Priority dot */}
              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${priorityColor}`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => {
                    if (item.client_id) {
                      router.push(`/clients/${item.client_id}`)
                    }
                  }}
                  className="text-white text-sm font-medium hover:text-blue-400 transition truncate block"
                >
                  {item.client_name || 'Unknown'}
                </button>
                <p className="text-gray-400 text-sm truncate">{item.suggestion || ''}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    if (item.id) {
                      updateFollowUp(item.id, 'actioned')
                    }
                  }}
                  className="text-green-500 hover:bg-green-500/10 rounded p-1.5 transition text-sm font-semibold"
                  title="Mark as done"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    if (item.id) {
                      updateFollowUp(item.id, 'dismissed')
                    }
                  }}
                  className="text-gray-500 hover:bg-gray-500/10 rounded p-1.5 transition text-sm font-semibold"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
