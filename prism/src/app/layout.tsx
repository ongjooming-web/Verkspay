import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <body className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {children}
      </body>
    </html>
  )
}
