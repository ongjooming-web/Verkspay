'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/hooks/useOnboarding'

const TOUR_STEPS = [
  {
    step: 0,
    title: 'Welcome to Prism! 👋',
    description: "Let's take a quick tour of your dashboard. We'll show you how to set up your business, add clients, and start getting paid faster.",
    target: null,
    position: 'center',
    buttons: [
      { label: "Let's Go", action: 'next', type: 'primary' },
      { label: 'Skip Tour', action: 'skip', type: 'secondary' }
    ]
  },
  {
    step: 1,
    title: 'Your command center',
    description: 'Navigate between your Dashboard, Clients, Invoices, Insights, Reports, Proposals, and Settings from here.',
    target: '[data-onboarding="nav"]',
    position: 'below',
    buttons: [{ label: 'Next', action: 'next', type: 'primary' }]
  },
  {
    step: 2,
    title: 'Business at a glance',
    description: 'Track your paid revenue, pending payments, active clients, and total invoices. These update automatically as you create and collect on invoices.',
    target: '[data-onboarding="metrics-cards"]',
    position: 'below',
    buttons: [{ label: 'Next', action: 'next', type: 'primary' }]
  },
  {
    step: 3,
    title: 'Set up your business profile',
    description: 'Add your company logo, address, and tax details. Connect Stripe to start accepting payments. This is your first step.',
    target: '[data-onboarding="nav-settings"]',
    position: 'below',
    buttons: [
      { label: 'Go to Settings', action: 'navigate', target: '/settings', type: 'primary' },
      { label: 'I\'ll do this later →', action: 'next', type: 'secondary' }
    ]
  },
  {
    step: 4,
    title: 'Add your first client',
    description: 'Add clients you work with. Include their name, email, and company. The more details you add, the smarter Prism\'s AI insights become.',
    target: '[data-onboarding="nav-clients"]',
    position: 'below',
    buttons: [
      { label: 'Go to Clients', action: 'navigate', target: '/clients', type: 'primary' },
      { label: 'Next', action: 'next', type: 'secondary' }
    ]
  },
  {
    step: 5,
    title: 'Send your first invoice',
    description: 'Create an invoice, add line items, and send it with a Stripe payment link. Smart reminders will follow up automatically if it goes overdue.',
    target: '[data-onboarding="nav-invoices"]',
    position: 'below',
    buttons: [
      { label: 'Go to Invoices', action: 'navigate', target: '/invoices', type: 'primary' },
      { label: 'Next', action: 'next', type: 'secondary' }
    ]
  },
  {
    step: 6,
    title: 'AI-powered business insights ✨',
    description: 'Once you have a few invoices, generate AI-powered analysis of your business — client segments, growth opportunities, risk alerts, and recommendations.',
    target: '[data-onboarding="nav-insights"]',
    position: 'below',
    buttons: [{ label: 'Got it!', action: 'next', type: 'primary' }]
  },
  {
    step: 7,
    title: "You're all set! 🎉",
    description: "Start by setting up your business profile in Settings, then add a client and send your first invoice. We're here to help you get paid faster.",
    target: null,
    position: 'center',
    buttons: [{ label: 'Start Using Prism', action: 'complete', type: 'primary' }]
  }
]

export function OnboardingTour() {
  const { showTour, tourStep, updateTourStep, completeOnboarding } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const router = useRouter()
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  if (!showTour) return null

  const step = TOUR_STEPS[currentStep]

  // Find and track target element
  useEffect(() => {
    const updatePosition = () => {
      if (!step.target) {
        setTargetRect(null)
        return
      }

      const target = document.querySelector(step.target)
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetRect(rect)

        // Scroll into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Calculate tooltip position
        const padding = 16
        let top = 0
        let left = 0

        if (step.position === 'below') {
          top = rect.bottom + padding
          left = rect.left + rect.width / 2 - 180 // Center tooltip (assuming ~360px width)
        } else if (step.position === 'above') {
          top = rect.top - padding - 200 // Approximate tooltip height
          left = rect.left + rect.width / 2 - 180
        } else if (step.position === 'right') {
          top = rect.top + rect.height / 2 - 100
          left = rect.right + padding
        } else if (step.position === 'left') {
          top = rect.top + rect.height / 2 - 100
          left = rect.left - padding - 360
        }

        // Clamp to viewport
        left = Math.max(16, Math.min(left, window.innerWidth - 376))
        top = Math.max(16, Math.min(top, window.innerHeight - 300))

        setTooltipPos({ top, left })
      }
    }

    updatePosition()

    // Setup ResizeObserver
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
    }

    resizeObserverRef.current = new ResizeObserver(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [step, currentStep])

  const handleAction = async (action: string, target?: string) => {
    if (action === 'next') {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      await updateTourStep(newStep)
    } else if (action === 'skip') {
      await updateTourStep(8) // Mark as skipped (beyond final step)
    } else if (action === 'navigate' && target) {
      await updateTourStep(currentStep + 1)
      router.push(target)
    } else if (action === 'complete') {
      await completeOnboarding()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleAction('skip')
    } else if (e.key === 'Enter') {
      handleAction('next')
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep])

  return (
    <>
      {/* Overlay with spotlight */}
      {step.position !== 'center' && (
        <div className="fixed inset-0 z-[1000] bg-black/60" />
      )}

      {/* Spotlight effect */}
      {step.position !== 'center' && targetRect && (
        <div
          className="fixed z-[1001] rounded-lg border border-purple-500/30 transition-all duration-400"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)'
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className={`fixed z-[1002] transition-all duration-400 ${
          step.position === 'center' ? 'flex items-center justify-center inset-0' : ''
        }`}
        style={step.position === 'center' ? undefined : { top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className="w-full max-w-[360px] rounded-2xl border border-purple-500/30 bg-[#1A1A2E] p-6 shadow-2xl">
          {/* Step counter */}
          <div className="mb-4 text-xs text-gray-400">
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </div>

          {/* Title */}
          <h2 className="mb-3 text-lg font-bold text-white">{step.title}</h2>

          {/* Description */}
          <p className="mb-6 text-sm text-gray-300 leading-relaxed">{step.description}</p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            {step.buttons.map((btn, idx) => (
              <button
                key={idx}
                onClick={() => handleAction(btn.action, btn.target)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  btn.type === 'primary'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'text-gray-400 hover:text-gray-300 bg-transparent'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
