import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Verkspay - Invoicing & Proposals',
  description: 'AI-powered invoicing platform for freelancers and small businesses. Smart insights, proposals, recurring invoices, and more.',
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
      </body>
    </html>
  )
}
