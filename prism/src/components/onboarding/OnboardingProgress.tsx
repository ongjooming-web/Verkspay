'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOnboarding } from '@/hooks/useOnboarding'
import { Card, CardBody } from '@/components/Card'

const TASK_CONFIG = [
  { key: 'business_profile', label: 'Business Profile', icon: '🏢', link: '/settings' },
  { key: 'stripe_connected', label: 'Connect Stripe', icon: '💳', link: '/settings' },
  { key: 'first_client', label: 'Add First Client', icon: '👥', link: '/clients' },
  { key: 'first_invoice', label: 'Send First Invoice', icon: '📄', link: '/invoices' },
  { key: 'ai_insights', label: 'Generate Insights', icon: '✨', link: '/insights' }
]

export function OnboardingProgress() {
  const { showProgress, status, completedCount, totalTasks, dismissProgress, completeOnboarding } = useOnboarding()
  const [showCelebration, setShowCelebration] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (showProgress && completedCount === totalTasks && !showCelebration) {
      setShowCelebration(true)
      const timer = setTimeout(() => {
        completeOnboarding()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [completedCount, totalTasks, showProgress, showCelebration, completeOnboarding])

  if (!showProgress || !status) return null

  const progressPercent = (completedCount / totalTasks) * 100

  if (showCelebration) {
    return (
      <Card className="mb-8 border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <CardBody className="text-center py-8">
          <p className="text-4xl mb-4">🎉</p>
          <h3 className="text-xl font-bold text-white mb-2">All set! You're ready to go</h3>
          <p className="text-gray-400 text-sm">You've completed all setup tasks. Start inviting clients and grow your business!</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="mb-8 border-purple-500/30 bg-purple-500/5">
      <CardBody className="space-y-4">
        {/* Header with title and dismiss button */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Getting Started</h3>
            <p className="text-sm text-gray-400">{completedCount} of {totalTasks} complete</p>
          </div>
          <button
            onClick={dismissProgress}
            className="text-gray-500 hover:text-gray-300 transition text-2xl leading-none"
            title="Dismiss"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Task pills */}
        <div className="flex flex-wrap gap-2">
          {TASK_CONFIG.map((task) => {
            const isComplete = status.tasks[task.key as keyof typeof status.tasks]
            return (
              <Link key={task.key} href={task.link}>
                <button
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                    isComplete
                      ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                      : 'bg-gray-800/50 border border-gray-700 text-gray-400'
                  }`}
                >
                  <span>{task.icon}</span>
                  {task.label}
                  {isComplete && <span>✓</span>}
                </button>
              </Link>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}
