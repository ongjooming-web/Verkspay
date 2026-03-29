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
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)

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
