'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './Button'
import { Card, CardBody, CardHeader } from './Card'
import { formatCurrency } from '@/lib/countries'

interface SendInvoiceModalProps {
  invoice: {
    id: string
    invoice_number: string
    amount: number
    currency_code?: string
    due_date: string
    payment_terms?: string
  }
  client: {
    name: string
    email: string
    phone?: string
  }
  profile: {
    business_name?: string
    full_name?: string
  }
  userEmail: string
  onClose: () => void
  onSent: () => void
}

type SendMethod = 'email' | 'whatsapp' | null

export function SendInvoiceModal({
  invoice,
  client,
  profile,
  userEmail,
  onClose,
  onSent
}: SendInvoiceModalProps) {
  const [method, setMethod] = useState<SendMethod>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Email form state
  const [emailTo, setEmailTo] = useState(client.email)
  const [emailCc, setEmailCc] = useState('')
  const [senderName, setSenderName] = useState(profile.business_name || profile.full_name || '')
  const [subject, setSubject] = useState(
    `Invoice "${invoice.invoice_number}" from ${profile.business_name || profile.full_name || 'Prism User'}`
  )
  const [emailMessage, setEmailMessage] = useState(
    `Hi ${client.name},\n\nPlease find your invoice ${invoice.invoice_number} for ${formatCurrency(
      invoice.amount,
      invoice.currency_code || 'MYR'
    )} due on ${new Date(invoice.due_date).toLocaleDateString()}.\n\nPayment terms: ${invoice.payment_terms || 'Net 30'}\n\nClick the button below to view and pay your invoice.\n\nThank you,\n${profile.business_name || profile.full_name || 'Prism User'}`
  )

  // WhatsApp form state
  const [whatsappPhone, setWhatsappPhone] = useState(client.phone || '')
  const [whatsappMessage, setWhatsappMessage] = useState(
    `Hi ${client.name}, here is your invoice ${invoice.invoice_number} for ${formatCurrency(
      invoice.amount,
      invoice.currency_code || 'MYR'
    )} from ${profile.business_name || profile.full_name || 'Prism User'}.\n\nDue date: ${new Date(
      invoice.due_date
    ).toLocaleDateString()}\n\nPayment terms: ${invoice.payment_terms || 'Net 30'}\n\nPay here: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.prismops.xyz'}/pay/${invoice.id}`
  )

  const handleSendEmail = async () => {
    if (!emailTo) {
      setMessage('❌ Please enter recipient email')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setMessage('❌ Session expired')
        setLoading(false)
        return
      }

      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          method: 'email',
          emailTo,
          emailCc,
          senderName,
          subject,
          emailMessage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(`❌ ${data.error || 'Failed to send'}`)
      } else {
        setMessage('✓ Email sent successfully!')
        setTimeout(() => {
          onSent()
          onClose()
        }, 1500)
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message || 'Error sending email'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSendWhatsApp = () => {
    if (!whatsappPhone) {
      setMessage('❌ Please enter phone number')
      return
    }

    // Format phone number (remove spaces, ensure + prefix)
    const formattedPhone = whatsappPhone.replace(/\s/g, '').startsWith('+')
      ? whatsappPhone.replace(/\s/g, '')
      : `+${whatsappPhone.replace(/\s/g, '')}`

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage)}`
    window.open(waUrl, '_blank')
    
    // Show feedback
    setMessage('✓ Opening WhatsApp...')
    setTimeout(() => {
      onSent()
      onClose()
    }, 1000)
  }

  if (method === null) {
    // Step 1: Choose send method
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        <Card className="relative max-w-2xl w-full">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">📨 Send Invoice</h2>
            <p className="text-gray-400 text-sm mt-2">Choose how to send invoice {invoice.invoice_number}</p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              {/* Email Option */}
              <button
                onClick={() => setMethod('email')}
                className="glass rounded-lg p-6 hover:bg-white/15 hover:border-blue-400/50 transition-all text-left group"
              >
                <div className="text-4xl mb-4">📧</div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">Email</h3>
                <p className="text-gray-400 text-sm mt-2">Send a formatted invoice email</p>
              </button>

              {/* WhatsApp Option */}
              <button
                onClick={() => setMethod('whatsapp')}
                className="glass rounded-lg p-6 hover:bg-white/15 hover:border-blue-400/50 transition-all text-left group"
              >
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">WhatsApp</h3>
                <p className="text-gray-400 text-sm mt-2">Send via WhatsApp message</p>
              </button>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (method === 'email') {
    // Step 2: Email form
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-h-screen overflow-y-auto">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        <Card className="relative max-w-2xl w-full my-8">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">📧 Send via Email</h2>
          </CardHeader>
          <CardBody className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* To */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">To *</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                placeholder="client@example.com"
              />
            </div>

            {/* CC */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">CC (Optional)</label>
              <input
                type="email"
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                placeholder="cc@example.com"
              />
            </div>

            {/* Sender Name */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Sender Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Sender Email (Read-only) */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">From (Email)</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="glass w-full px-4 py-3 rounded-lg text-gray-500 bg-gray-900/50 cursor-not-allowed"
              />
              <p className="text-gray-500 text-xs mt-1">Read-only - emails sent from support@prismops.xyz</p>
            </div>

            {/* Subject */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Message</label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={8}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>

            {/* Message Display */}
            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.includes('✓')
                    ? 'bg-green-500/10 border border-green-400/30 text-green-300'
                    : 'bg-red-500/10 border border-red-400/30 text-red-300'
                }`}
              >
                {message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                onClick={() => setMethod(null)}
                variant="outline"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? '⏳ Sending...' : '📨 Send Email'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (method === 'whatsapp') {
    // Step 3: WhatsApp form
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
        <Card className="relative max-w-2xl w-full">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">💬 Send via WhatsApp</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Phone Number */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Phone Number *</label>
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                placeholder="+60123456789"
              />
              <p className="text-gray-500 text-xs mt-1">Include country code (e.g., +60 for Malaysia)</p>
            </div>

            {/* Message */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Message</label>
              <textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={8}
                className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>

            {/* Message Display */}
            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.includes('✓')
                    ? 'bg-green-500/10 border border-green-400/30 text-green-300'
                    : 'bg-red-500/10 border border-red-400/30 text-red-300'
                }`}
              >
                {message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                onClick={() => setMethod(null)}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendWhatsApp}
                className="bg-blue-600 hover:bg-blue-700"
              >
                💬 Open WhatsApp
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  return null
}
