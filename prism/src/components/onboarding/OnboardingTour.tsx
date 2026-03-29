'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const { showTour, tourStep, updateTourStep, completeOnboarding, status, refresh } = useOnboarding()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Refetch onboarding status when pathname changes (user navigates to a new page)
  // This ensures tour_step updates from the server are reflected in the UI
  useEffect(() => {
    if (mounted && pathname) {
      console.log('[Tour] Pathname changed to:', pathname, 'fetching latest status...')
      refresh()
    }
  }, [pathname, mounted, refresh])

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

  const handleNext = () => {
    console.log('[Tour] Button clicked: Next, step:', tourStep)
    if (tourStep === STEPS.length - 1) {
      completeOnboarding()
    } else {
      updateTourStep(tourStep + 1)
    }
  }

  const handleSkip = () => {
    console.log('[Tour] Button clicked: Skip Tour, step:', tourStep)
    completeOnboarding()
  }

  const handleNavigate = (path: string, label: string) => {
    console.log('[Tour] Button clicked:', label, 'step:', tourStep, 'navigating to:', path)
    updateTourStep(tourStep + 1)
    router.push(path)
  }

  const handleLetsGo = () => {
    console.log('[Tour] Button clicked: Let\'s Go, step:', tourStep)
    updateTourStep(1)
  }

  const handleGotIt = () => {
    console.log('[Tour] Button clicked: Got it!, step:', tourStep)
    updateTourStep(tourStep + 1)
  }

  const handleStartUsing = () => {
    console.log('[Tour] Button clicked: Start Using Prism, step:', tourStep)
    completeOnboarding()
  }

  const handleLater = () => {
    console.log('[Tour] Button clicked: I\'ll do this later, step:', tourStep)
    updateTourStep(tourStep + 1)
  }

  return (
    <>
      {/* Overlay — blocks page interaction but not button clicks within tour */}
      <div className="fixed inset-0 z-[9998] bg-black/60 pointer-events-auto" />

      {/* Tour content container — positioned above overlay, all clicks go through */}
      <div
        className={`fixed z-[9999] pointer-events-auto ${
          step.centered
            ? 'inset-0 flex items-center justify-center p-4'
            : 'top-32 left-1/2 transform -translate-x-1/2 max-w-[90vw] w-full max-w-[400px] px-4'
        }`}
      >
        {/* Modal card */}
        <div className="w-full max-w-[400px] rounded-2xl bg-[#1A1A2E] border border-purple-500/30 p-6 sm:p-8 shadow-2xl">
          {/* Step counter */}
          <div className="mb-4 text-xs text-gray-400">
            Step {tourStep + 1} of {STEPS.length}
          </div>

          {/* Title */}
          <h2 className="mb-3 text-lg sm:text-xl font-bold text-white">{step.title}</h2>

          {/* Description */}
          <p className="mb-6 text-sm text-gray-300 leading-relaxed">{step.description}</p>

          {/* Buttons container */}
          <div className="flex flex-col gap-3">
            {/* Step 0: Welcome */}
            {tourStep === 0 && (
              <>
                <button
                  type="button"
                  onClick={handleLetsGo}
                  className="w-full min-h-[44px] px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-sm font-medium transition duration-150"
                >
                  Let's Go
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full min-h-[44px] px-4 py-3 text-gray-400 hover:text-gray-300 active:text-gray-200 bg-transparent text-sm font-medium transition duration-150"
                >
                  Skip Tour
                </button>
              </>
            )}

            {/* Step 3: Go to Settings */}
            {tourStep === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavigate('/settings', 'Go to Settings')}
                  className="w-full min-h-[44px] px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-sm font-medium transition duration-150"
                >
                  Go to Settings
                </button>
                <button
                  type="button"
                  onClick={handleLater}
                  className="w-full min-h-[44px] px-4 py-3 text-gray-400 hover:text-gray-300 active:text-gray-200 bg-transparent text-sm font-medium transition duration-150"
                >
                  I'll do this later →
                </button>
              </>
            )}

            {/* Step 4: Go to Clients */}
            {tourStep === 4 && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavigate('/clients', 'Go to Clients')}
                  className="w-full min-h-[44px] px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-sm font-medium transition duration-150"
                >
                  Go to Clients
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full min-h-[44px] px-4 py-3 text-gray-400 hover:text-gray-300 active:text-gray-200 bg-transparent text-sm font-medium transition duration-150"
                >
                  Next
                </button>
              </>
            )}

            {/* Step 5: Go to Invoices */}
            {tourStep === 5 && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavigate('/invoices', 'Go to Invoices')}
                  className="w-full min-h-[44px] px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-sm font-medium transition duration-150"
                >
                  Go to Invoices
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full min-h-[44px] px-4 py-3 text-gray-400 hover:text-gray-300 active:text-gray-200 bg-transparent text-sm font-medium transition duration-150"
                >
                  Next
                </button>
              </>
            )}

            {/* Step 6: Got it! */}
            {tourStep === 6 && (
              <button
                type="button"
                onClick={handleGotIt}
                className="w-full min-h-[44px] px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-sm font-medium transition duration-150"
              >
                Got it!
              </button>
            )}

            {/* Step 7: Start Using Prism */}
            {tourStep === 7 && (
              <button
                type="button"
                onClick={handleStartUsing}
                className="w-full min-h-[44px] px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-sm font-medium transition duration-150"
              >
                Start Using Prism
              </button>
            )}

            {/* Steps 1, 2: Default Next button */}
            {tourStep === 1 || tourStep === 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="w-full min-h-[44px] px-4 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg text-sm font-medium transition duration-150"
              >
                Next
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
