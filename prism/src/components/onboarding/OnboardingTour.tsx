'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/hooks/useOnboarding'

const STEPS = [
  {
    id: 0,
    title: 'Welcome to Prism! 👋',
    description: "Let's take a quick tour of your dashboard. We'll show you how to set up your business and start getting paid faster.",
    centered: true,
  },
  {
    id: 1,
    title: 'Your command center',
    description: 'Navigate between your Dashboard, Clients, Invoices, Insights, Reports, Proposals, and Settings from here.',
    centered: false,
  },
  {
    id: 2,
    title: 'Business at a glance',
    description: 'Track your paid revenue, pending payments, active clients, and total invoices. These update automatically.',
    centered: false,
  },
  {
    id: 3,
    title: 'Set up your business profile',
    description: 'Add your company logo, address, and tax details. Connect Stripe to start accepting payments.',
    centered: false,
  },
  {
    id: 4,
    title: 'Add your first client',
    description: 'Add clients you work with. Include their name, email, and company. More details = smarter AI insights.',
    centered: false,
  },
  {
    id: 5,
    title: 'Send your first invoice',
    description: 'Create an invoice, add line items, and send it with a Stripe payment link. Smart reminders follow up automatically.',
    centered: false,
  },
  {
    id: 6,
    title: 'AI-powered business insights ✨',
    description: 'Once you have a few invoices, generate AI-powered analysis of your business — client segments, growth opportunities, and recommendations.',
    centered: false,
  },
  {
    id: 7,
    title: "You're all set! 🎉",
    description: "Start by setting up your business profile in Settings, then add a client and send your first invoice. We're here to help you get paid faster.",
    centered: true,
  },
]

export function OnboardingTour() {
  const { showTour, tourStep, updateTourStep, completeOnboarding, status } = useOnboarding()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render if:
  // - Not mounted yet
  // - Tour shouldn't show (completed or not at step 0)
  // - Status not loaded yet
  // - User already completed the tour (onboarding_completed === true)
  if (!mounted || !showTour || !status || status.completed) {
    return null
  }

  const step = STEPS[tourStep]
  if (!step) return null

  const handleNext = async () => {
    if (tourStep === STEPS.length - 1) {
      await completeOnboarding()
    } else {
      await updateTourStep(tourStep + 1)
    }
  }

  const handleSkip = async () => {
    // Skip = complete the tour forever
    await completeOnboarding()
  }

  const handleNavigate = async (path: string) => {
    await updateTourStep(tourStep + 1)
    router.push(path)
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[1000] bg-black/60" />

      {/* Tooltip */}
      <div
        className={`fixed z-[1001] ${
          step.centered
            ? 'inset-0 flex items-center justify-center p-4'
            : 'top-32 left-1/2 transform -translate-x-1/2'
        }`}
      >
        <div className="w-full max-w-[400px] rounded-2xl bg-[#1A1A2E] border border-purple-500/30 p-8 shadow-2xl">
          <div className="mb-4 text-xs text-gray-400">
            Step {tourStep + 1} of {STEPS.length}
          </div>

          <h2 className="mb-3 text-xl font-bold text-white">{step.title}</h2>

          <p className="mb-6 text-sm text-gray-300 leading-relaxed">{step.description}</p>

          <div className="flex flex-col gap-3">
            {tourStep === 0 && (
              <>
                <button
                  onClick={handleNext}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Let's Go
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full px-4 py-2 text-gray-400 hover:text-gray-300 bg-transparent text-sm font-medium transition"
                >
                  Skip Tour
                </button>
              </>
            )}

            {tourStep === 3 && (
              <>
                <button
                  onClick={() => handleNavigate('/settings')}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Go to Settings
                </button>
                <button
                  onClick={handleNext}
                  className="w-full px-4 py-2 text-gray-400 hover:text-gray-300 bg-transparent text-sm font-medium transition"
                >
                  I'll do this later →
                </button>
              </>
            )}

            {tourStep === 4 && (
              <>
                <button
                  onClick={() => handleNavigate('/clients')}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Go to Clients
                </button>
                <button
                  onClick={handleNext}
                  className="w-full px-4 py-2 text-gray-400 hover:text-gray-300 bg-transparent text-sm font-medium transition"
                >
                  Next
                </button>
              </>
            )}

            {tourStep === 5 && (
              <>
                <button
                  onClick={() => handleNavigate('/invoices')}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Go to Invoices
                </button>
                <button
                  onClick={handleNext}
                  className="w-full px-4 py-2 text-gray-400 hover:text-gray-300 bg-transparent text-sm font-medium transition"
                >
                  Next
                </button>
              </>
            )}

            {tourStep === 6 && (
              <button
                onClick={handleNext}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
              >
                Got it!
              </button>
            )}

            {tourStep === 7 && (
              <button
                onClick={handleNext}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
              >
                Start Using Prism
              </button>
            )}

            {![0, 3, 4, 5, 6, 7].includes(tourStep) && (
              <button
                onClick={handleNext}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
