'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { PartialPaymentModal } from '@/components/PartialPaymentModal'
import { SendInvoiceModal } from '@/components/SendInvoiceModal'
import Link from 'next/link'
import { formatCurrency } from '@/lib/countries'
import { useCurrency } from '@/hooks/useCurrency'

interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  client_name?: string
  amount: number
  status: string
  due_date: string
  description?: string
  created_at: string
  paid_date?: string
  payment_method?: string
  reminder_sent_count?: number
  last_reminder_sent_at?: string
  amount_paid?: number
  remaining_balance?: number
  currency_code?: string
  payment_terms?: string
  sent_at?: string
  clients?: {
    email: string
    name: string
  }
}

interface PaymentRecord {
  id: string
  amount_paid: number
  payment_date: string
  payment_type: string
  tx_hash?: string
  status: string
}

export default function InvoiceDetail() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string
  const { currencyCode } = useCurrency()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [sendingReminder, setSendingReminder] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false)
  const [showStripePaymentModal, setShowStripePaymentModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendingInvoice, setSendingInvoice] = useState(false)
  const [sendMessage, setSendMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [profile, setProfile] = useState<any>({})

  useEffect(() => {
    fetchInvoiceDetails()
    fetchPaymentRecords()
    fetchUserProfile()
  }, [invoiceId])

  const fetchUserProfile = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user?.email) {
      setUserEmail(userData.user.email)
    }

    if (userData?.user?.id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('business_name, full_name')
        .eq('id', userData.user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }
    }
  }

  const fetchInvoiceDetails = async () => {
    console.log('[InvoiceDetail] Fetching invoice details for:', invoiceId)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*, currency_code')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single()

    console.log('[InvoiceDetail] Fetched invoice data:', data)
    if (error) {
      console.error('[InvoiceDetail] Error fetching invoice:', error)
    }

    if (data) {
      // Fetch client name
      const { data: clientData } = await supabase
        .from('clients')
        .select('name')
        .eq('id', data.client_id)
        .single()

      const invoiceWithClient = {
        ...data,
        client_name: clientData?.name || 'Unknown Client'
      }
      console.log('[InvoiceDetail] Invoice with client:', invoiceWithClient)
      setInvoice(invoiceWithClient)
      setEditData(invoiceWithClient)
    }
    setLoading(false)
  }

  const fetchPaymentRecords = async () => {
    const { data } = await supabase
      .from('payment_records')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })

    if (data) {
      setPaymentRecords(data)
    }
  }

  const handleUpdateInvoice = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId || !invoice) return

    const { error } = await supabase
      .from('invoices')
      .update({
        amount: parseFloat(editData.amount),
        due_date: editData.due_date,
        status: editData.status,
        description: editData.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    if (!error) {
      await fetchInvoiceDetails()
      setIsEditing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-500/20 border-green-400/30 text-green-300'
      case 'paid_partial': return 'bg-amber-500/20 border-amber-400/30 text-amber-300'
      case 'unpaid': return 'bg-blue-500/20 border-blue-400/30 text-blue-300'
      case 'overdue': return 'bg-red-500/20 border-red-400/30 text-red-300'
      default: return 'bg-gray-500/20 border-gray-400/30 text-gray-300'
    }
  }

  const handleSendReminder = async () => {
    if (!invoice) return

    // Check if invoice is paid
    if (invoice.status === 'paid') {
      alert('Cannot send reminder for paid invoice')
      return
    }

    // Check if invoice is overdue
    const dueDate = new Date(invoice.due_date)
    const now = new Date()
    if (dueDate > now) {
      alert('Invoice is not yet due. Cannot send reminder.')
      return
    }

    // Check reminder limit
    const reminderCount = invoice.reminder_sent_count || 0
    if (reminderCount >= 3) {
      alert('Maximum reminders (3) already sent for this invoice')
      return
    }

    setSendingReminder(true)
    setReminderMessage('')

    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        alert('Session expired. Please refresh and try again.')
        setSendingReminder(false)
        return
      }

      const response = await fetch('/api/invoices/send-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ invoiceId: invoice.id })
      })

      const data = await response.json()

      if (!response.ok) {
        setReminderMessage(`❌ Error: ${data.error || 'Failed to send reminder'}`)
      } else {
        setReminderMessage(`✅ ${data.message}`)
        // Refresh invoice to show updated reminder count
        setTimeout(() => {
          fetchInvoiceDetails()
          setReminderMessage('')
        }, 2000)
      }
    } catch (err: any) {
      setReminderMessage(`❌ Error: ${err.message || 'Failed to send reminder'}`)
    } finally {
      setSendingReminder(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!invoice) return

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) return

    // Mark as paid with full amount received
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        amount_paid: invoice.amount,
        remaining_balance: 0,
        paid_date: new Date().toISOString(),
        payment_method: 'manual',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    if (!error) {
      alert('✅ Invoice marked as paid')
      fetchInvoiceDetails()
    } else {
      alert(`❌ Error: ${error.message}`)
    }
  }

  const handleDeleteInvoice = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) return

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('user_id', userId)

    if (!error) {
      router.push('/invoices')
    }
  }

  const handleOpenSendModal = () => {
    setShowSendModal(true)
  }

  const handleSentSuccess = () => {
    fetchInvoiceDetails()
    setSendMessage('')
  }

  if (loading) {
    return (
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="flex justify-center items-center h-screen">
          <div className="glass px-8 py-6 rounded-lg">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-gray-300">Loading invoice...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen relative z-10">
        <Navigation />
        <div className="flex justify-center items-center h-screen">
          <div className="glass px-8 py-6 rounded-lg">
            <div className="text-center">
              <p className="text-red-300 mb-4">Invoice not found</p>
              <Link href="/invoices">
                <Button>← Back to Invoices</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }



  const isOverdue = invoice.status !== 'paid' && new Date(invoice.due_date) < new Date()

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 pb-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 gap-4">
          <Link href="/invoices">
            <Button variant="outline" className="mb-4">← Back</Button>
          </Link>
          <div className="text-right">
            {isEditing ? (
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateInvoice}
                  className="bg-green-600/80 hover:bg-green-700/80"
                >
                  ✓ Save
                </Button>
                <Button 
                  onClick={() => setIsEditing(false)}
                  className="bg-red-600/80 hover:bg-red-700/80"
                >
                  ✕ Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap justify-end">
                <Button 
                  onClick={handleOpenSendModal}
                  className="bg-purple-600 hover:bg-purple-700"
                  title={invoice.sent_at ? 'Resend invoice to client' : 'Send invoice to client'}
                >
                  {invoice.sent_at ? '🔁 Resend Invoice' : '📨 Send to Client'}
                </Button>
                {invoice.status !== 'paid' && (
                  <>
                    <Button 
                      onClick={() => {
                        const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.prismops.xyz'}/pay/${invoice.id}`
                        navigator.clipboard.writeText(paymentUrl)
                        alert('Payment link copied to clipboard!')
                      }}
                      className="bg-green-600/80 hover:bg-green-700/80"
                      title="Copy shareable payment link"
                    >
                      🔗 Share Payment Link
                    </Button>
                    <Button 
                      onClick={handleMarkAsPaid}
                      className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 font-semibold"
                      title="Mark invoice as fully paid"
                    >
                      ✓ Mark as Paid
                    </Button>
                  </>
                )}
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600/80 hover:bg-blue-700/80"
                >
                  ✎ Edit
                </Button>
                <Button 
                  onClick={handleDeleteInvoice}
                  className="bg-red-600/80 hover:bg-red-700/80"
                >
                  🗑 Delete
                </Button>
              </div>
            )}
            {sendMessage && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${sendMessage.includes('✓') ? 'bg-green-500/10 border border-green-400/30 text-green-300' : 'bg-red-500/10 border border-red-400/30 text-red-300'}`}>
                {sendMessage}
              </div>
            )}
          </div>
        </div>

        {/* Main Invoice Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{invoice.invoice_number}</h1>
                <p className="text-gray-400">Client: <span className="text-blue-300 font-semibold">{invoice.client_name}</span></p>
              </div>
              <span className={`px-6 py-2 rounded-full text-lg font-medium border ${getStatusColor(invoice.status)}`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            {isEditing ? (
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Amount ({invoice.currency_code || currencyCode || 'MYR'})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.amount}
                      onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Due Date</label>
                    <input
                      type="date"
                      value={editData.due_date}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                      className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Status</label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none"
                  >
                    <option value="draft" className="bg-slate-900">Draft</option>
                    <option value="sent" className="bg-slate-900">Sent</option>
                    <option value="paid" className="bg-slate-900">Paid</option>
                    <option value="overdue" className="bg-slate-900">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Description</label>
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={4}
                    className="glass w-full px-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </form>
            ) : (
              <>
                {isOverdue && invoice.status !== 'paid' && (
                  <div className="glass border-red-500/50 bg-red-500/10 px-4 py-3 rounded-lg text-red-300">
                    ⚠️ This invoice is overdue!
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Amount</p>
                    <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {formatCurrency(invoice.amount, invoice.currency_code || currencyCode || 'MYR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Due Date</p>
                    <p className="text-2xl font-semibold text-white">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Created</p>
                    <p className="text-2xl font-semibold text-white">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {invoice.description && (
                  <div className="border-t border-white/10 pt-6">
                    <p className="text-gray-400 text-sm mb-2">Description</p>
                    <p className="text-white whitespace-pre-wrap">{invoice.description}</p>
                  </div>
                )}

                {invoice.paid_date && (
                  <div className="border-t border-white/10 pt-6 glass border-green-500/30 bg-green-500/10">
                    <p className="text-gray-400 text-sm mb-2">Paid Date</p>
                    <p className="text-white font-semibold">{new Date(invoice.paid_date).toLocaleDateString()}</p>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* USDC Payment Card - Removed (component not implemented yet) */}

        {/* Smart Payment Reminders Card */}
        {invoice && invoice.status !== 'paid' && new Date(invoice.due_date) < new Date() && (
          <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">📧 Payment Reminders</h2>
              <p className="text-gray-400 text-sm mt-1">Send automatic payment reminders to your client</p>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Reminder Status */}
              <div className="glass rounded-lg p-4 border-amber-400/30">
                <p className="text-gray-400 text-sm mb-2">Reminder Status</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-amber-300">
                      {invoice.reminder_sent_count || 0} of 3
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {invoice.reminder_sent_count === 0 && '🔔 No reminders sent yet'}
                      {invoice.reminder_sent_count === 1 && '⚠️ First reminder sent (Day 1)'}
                      {invoice.reminder_sent_count === 2 && '⚠️ Second reminder sent (Day 3)'}
                      {invoice.reminder_sent_count === 3 && '🔴 Final reminder sent (Day 7) - No more reminders available'}
                    </p>
                  </div>
                </div>

                {invoice.last_reminder_sent_at && (
                  <p className="text-gray-400 text-xs mt-3 border-t border-white/10 pt-3">
                    Last sent: {new Date(invoice.last_reminder_sent_at).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Send Reminder Button */}
              <div>
                {invoice.reminder_sent_count && invoice.reminder_sent_count < 3 ? (
                  <>
                    <p className="text-gray-400 text-xs mb-3">
                      {invoice.reminder_sent_count === 1 && '📩 Send a follow-up (Day 3 template)'}
                      {invoice.reminder_sent_count === 2 && '🚨 Send final urgent reminder (Day 7 template)'}
                    </p>
                    <Button
                      onClick={handleSendReminder}
                      disabled={sendingReminder}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {sendingReminder ? '⏳ Sending...' : '📧 Send Next Reminder'}
                    </Button>
                  </>
                ) : invoice.reminder_sent_count === 0 ? (
                  <>
                    <p className="text-gray-400 text-xs mb-3">
                      Send a polite payment reminder to your client
                    </p>
                    <Button
                      onClick={handleSendReminder}
                      disabled={sendingReminder}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {sendingReminder ? '⏳ Sending...' : '📧 Send Reminder'}
                    </Button>
                  </>
                ) : (
                  <div className="glass border-amber-400/30 bg-amber-500/10 px-4 py-3 rounded-lg text-amber-300">
                    ✅ All 3 reminders have been sent to this client
                  </div>
                )}
              </div>

              {/* Message Display */}
              {reminderMessage && (
                <div className={`glass rounded-lg p-3 text-sm ${reminderMessage.includes('✅') ? 'border-green-400/30 bg-green-500/10 text-green-300' : 'border-red-400/30 bg-red-500/10 text-red-300'}`}>
                  {reminderMessage}
                </div>
              )}

              {/* Info */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-400 text-xs leading-relaxed">
                  <strong>How it works:</strong> Reminders escalate over time:
                  <br />• <strong>Day 1:</strong> Polite reminder
                  <br />• <strong>Day 3:</strong> Friendly follow-up
                  <br />• <strong>Day 7:</strong> Final urgent request
                  <br /><br />
                  Emails include invoice details and a "Pay Now" button linking to your payment page.
                </p>
              </div>
            </CardBody>
          </Card>
        )}



        {/* Partial Payments Card */}
        {invoice && invoice.status !== 'paid' && (
          <Card className="mb-8 border-purple-500/30 bg-purple-500/5">
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">💜 Partial Payments</h2>
              <p className="text-gray-400 text-sm mt-1">Record payments or create payment links</p>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Payment Summary */}
              <div className="glass rounded-lg p-4 border-purple-400/30">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Total Amount</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(invoice.amount, invoice.currency_code || currencyCode || 'MYR')}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Amount Paid</p>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(invoice.amount_paid || 0, invoice.currency_code || currencyCode || 'MYR')}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Remaining</p>
                    <p className="text-xl font-bold text-red-400">{formatCurrency(invoice.remaining_balance || invoice.amount, invoice.currency_code || currencyCode || 'MYR')}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowManualPaymentModal(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  💰 Record Manual
                </Button>
                <Button
                  onClick={() => setShowStripePaymentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  💳 Create Link
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Payment Records */}
        {paymentRecords.length > 0 && invoice && (
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">📋 Payment History</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {paymentRecords.map((payment, idx) => (
                <div 
                  key={payment.id}
                  className={`p-4 glass rounded-lg ${idx < paymentRecords.length - 1 ? 'border-b border-white/10' : ''}`}
                >
                  <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                    <div>
                      <p className="text-white font-semibold">{formatCurrency(payment.amount_paid, invoice?.currency_code || currencyCode || 'MYR')} via {payment.payment_type.toUpperCase()}</p>
                      <p className="text-gray-400 text-sm mt-1">{new Date(payment.payment_date).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border ${
                      payment.status === 'completed' 
                        ? 'bg-green-500/20 border-green-400/30 text-green-300'
                        : 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </div>
                  {payment.tx_hash && (
                    <p className="text-gray-400 text-sm mt-3 font-mono break-all">TX: {payment.tx_hash}</p>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {/* Partial Payment Modals */}
        {showManualPaymentModal && (
          <PartialPaymentModal
            invoiceId={invoiceId}
            invoiceNumber={invoice?.invoice_number || ''}
            remainingBalance={invoice?.remaining_balance || invoice?.amount || 0}
            type="manual"
            currencyCode={invoice?.currency_code}
            onClose={() => setShowManualPaymentModal(false)}
            onSuccess={() => {
              setShowManualPaymentModal(false)
              fetchInvoiceDetails()
              fetchPaymentRecords()
            }}
          />
        )}

        {showStripePaymentModal && (
          <PartialPaymentModal
            invoiceId={invoiceId}
            invoiceNumber={invoice?.invoice_number || ''}
            remainingBalance={invoice?.remaining_balance || invoice?.amount || 0}
            type="stripe"
            currencyCode={invoice?.currency_code}
            onClose={() => setShowStripePaymentModal(false)}
            onSuccess={() => {
              setShowStripePaymentModal(false)
              fetchInvoiceDetails()
              fetchPaymentRecords()
            }}
          />
        )}

        {showSendModal && invoice && (
          <SendInvoiceModal
            invoice={{
              id: invoice.id,
              invoice_number: invoice.invoice_number,
              amount: invoice.amount,
              currency_code: invoice.currency_code,
              due_date: invoice.due_date,
              payment_terms: invoice.payment_terms
            }}
            client={{
              name: invoice.client_name || 'Client',
              email: invoice.clients?.email || '',
              phone: invoice.clients?.phone
            }}
            profile={{
              business_name: profile.business_name,
              full_name: profile.full_name
            }}
            userEmail={userEmail}
            onClose={() => setShowSendModal(false)}
            onSent={handleSentSuccess}
          />
        )}
      </div>

    </div>
  )
}

// Legacy PaymentModal - REMOVED (using PaymentCard component instead)
function _LegacyPaymentModal({ invoice, onClose, onConfirm }: any) {
  const [step, setStep] = useState<'address' | 'confirm' | 'success'>('address')
  const [gasEstimate] = useState(2.5)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <Card className="relative max-w-lg w-full mx-4">
        <CardHeader>
          <h3 className="text-2xl font-bold text-white">
            {step === 'address' && '💳 Send Payment'}
            {step === 'confirm' && '✓ Confirm Payment'}
            {step === 'success' && '🎉 Payment Confirmed'}
          </h3>
        </CardHeader>
        <CardBody className="space-y-6">
          {step === 'address' && (
            <>
              <div className="glass rounded-lg p-4 border-blue-400/30">
                <p className="text-gray-400 text-sm mb-2">Recipient Address (USDC)</p>
                <p className="text-white font-mono break-all text-sm">0x742d35Cc6634C0532925a3b844Bc9e7595f42b6b</p>
              </div>
              <div className="glass rounded-lg p-4 border-blue-400/30">
                <p className="text-gray-400 text-sm mb-2">Amount</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(invoice.amount, 'USD')} USDC</p>
              </div>
              <div className="glass rounded-lg p-4 border-orange-400/30">
                <p className="text-gray-400 text-sm mb-2">Estimated Gas Fee</p>
                <p className="text-white">{formatCurrency(gasEstimate, 'USD')}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={() => setStep('confirm')} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
                  Continue
                </Button>
              </div>
            </>
          )}
          {step === 'confirm' && (
            <>
              <div className="glass rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-4">Please confirm the payment details:</p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white font-semibold">{formatCurrency(invoice.amount, 'USD')} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Fee:</span>
                    <span className="text-white font-semibold">{formatCurrency(gasEstimate, 'USD')}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-gray-300 font-semibold">Total:</span>
                    <span className="text-blue-400 font-bold text-lg">{formatCurrency(invoice.amount + gasEstimate, 'USD')}</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Clicking confirm will simulate the payment transaction.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('address')} className="flex-1">Back</Button>
                <Button onClick={() => setStep('success')} className="flex-1 bg-gradient-to-r from-green-600 to-green-700">
                  ✓ Confirm
                </Button>
              </div>
            </>
          )}
          {step === 'success' && (
            <>
              <div className="glass rounded-lg p-6 border-green-400/30 bg-green-500/10 text-center">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-white font-semibold text-lg mb-2">Payment Successful!</p>
                <p className="text-gray-400 text-sm">Transaction simulated</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-2 uppercase">SIMULATED TRANSACTION ID</p>
                <p className="text-white font-mono text-sm break-all">0x{Math.random().toString(16).slice(2).toUpperCase()}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
                <Button 
                  onClick={onConfirm}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  Mark as Paid
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
