'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

/**
 * OnboardingWrapper
 * 
 * Persistent wrapper that shows onboarding tour and progress bar
 * across all authenticated pages (not just dashboard).
 * 
 * - Tour shows on all pages while onboarding_completed = false
 * - Progress bar shows on all pages while onboarding_dismissed = false
 * - Both components auto-hide when onboarding is complete
 * - Works on mobile and desktop
 */
export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render on non-authenticated pages
  if (!mounted || pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth')) {
    return children
  }

  return (
    <>
      {/* Persistent onboarding components */}
      <div className="fixed top-0 left-0 right-0 z-[5000] pointer-events-none">
        {/* Progress bar (fixed to top, but only on pages with room) */}
        {pathname !== '/login' && pathname !== '/signup' && (
          <div className="pointer-events-auto">
            <OnboardingProgress />
          </div>
        )}
      </div>

      {/* Main content */}
      {children}

      {/* Tour overlay (fixed positioning, appears on top of everything) */}
      <OnboardingTour />
    </>
  )
}
