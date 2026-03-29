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
    <html lang="en" className="light">
      <body className="bg-gradient-to-b from-white via-blue-50 to-white">
        {children}
      </body>
    </html>
  )
}
