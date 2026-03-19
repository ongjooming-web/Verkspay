'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login - this is an internal tool, not a public landing page
    router.push('/login')
  }, [router])

  return null
}
