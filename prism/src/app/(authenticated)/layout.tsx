'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

/**
 * Authenticated layout
 * 
 * Wraps all authenticated pages with persistent onboarding components.
 * - Tour shows across all authenticated pages
 * - Progress bar shows across all authenticated pages
 * - Auto-hides when onboarding_completed = true
 * 
 * The OnboardingTour and OnboardingProgress components use the useOnboarding hook,
 * which fetches the saved tour_step from the database on mount and after navigation.
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    
    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription?.unsubscribe()
  }, [])

  // Key insight: The OnboardingTour and OnboardingProgress components are mounted here in the layout,
  // so they persist across page navigations. Their useOnboarding hook fetches fresh status on mount
  // and after route changes. No special handling needed here — just keep them mounted.

  if (!mounted) {
    return children
  }

  // Only show onboarding if authenticated
  if (!isAuthenticated) {
    return children
  }

  return (
    <div className="relative">
      {/* Progress bar at top */}
      <div className="fixed top-0 left-0 right-0 z-[5000] pointer-events-none">
        <div className="pointer-events-auto">
          <OnboardingProgress />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-0">
        {children}
      </div>

      {/* Tour overlay (fixed positioning) */}
      <OnboardingTour />
    </div>
  )
}
