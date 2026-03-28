import type { Metadata } from 'next'
import './globals.css'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'

export const metadata: Metadata = {
  title: 'Prism - Invoicing & Proposals',
  description: 'Simple invoicing and proposal management with crypto payments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark">
        {children}
        <OnboardingTour />
      </body>
    </html>
  )
}
