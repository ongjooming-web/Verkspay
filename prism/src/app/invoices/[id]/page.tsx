'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { USDCPaymentCard } from '@/components/USDCPaymentCard'
import Link from 'next/link'

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

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    fetchInvoiceDetails()
    fetchPaymentRecords()
  }, [invoiceId])

  const fetchInvoiceDetails = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single()

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

  const handleMarkAsPaid = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id

    if (!userId || !invoice) return

    // Update invoice status
    await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString(),
        payment_method: 'usdc'
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)

    // Create payment record
    await supabase
      .from('payment_records')
      .insert([
        {
          user_id: userId,
          invoice_id: invoiceId,
          payment_type: 'usdc',
          amount_paid: invoice.amount,
          status: 'completed'
        }
      ])

    await fetchInvoiceDetails()
    await fetchPaymentRecords()
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-green-500/20 border-green-400/30 text-green-300'
      case 'draft': return 'bg-gray-500/20 border-gray-400/30 text-gray-300'
      case 'overdue': return 'bg-red-500/20 border-red-400/30 text-red-300'
      default: return 'bg-blue-500/20 border-blue-400/30 text-blue-300'
    }
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
              <div className="flex gap-2">
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
                    <label className="text-gray-400 text-sm mb-2 block">Amount (USD)</label>
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
                      ${invoice.amount.toFixed(2)}
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

        {/* USDC Payment Card */}
        {invoice && invoice.status !== 'paid' && (
          <USDCPaymentCard
            invoiceId={invoiceId}
            invoiceAmount={invoice.amount}
            invoiceNumber={invoice.invoice_number}
            status={invoice.status}
            onPaymentMarked={async () => {
              // Refresh invoice details after payment is marked
              console.log('[InvoiceDetail] Payment marked, refreshing invoice...')
              await new Promise(resolve => setTimeout(resolve, 500)) // Small delay to ensure DB is updated
              await fetchInvoiceDetails()
              await fetchPaymentRecords()
              console.log('[InvoiceDetail] Invoice refreshed successfully')
            }}
          />
        )}

        {/* Legacy Payment Section (for manual marking) */}
        {invoice.status !== 'paid' && (
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-2xl font-bold text-white">💳 Mark as Paid</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-gray-400">Manually confirm receipt of payment</p>
              <Button 
                onClick={() => setShowPaymentModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/50 w-full md:w-auto"
              >
                ✓ Confirm Payment Received
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Payment Records */}
        {paymentRecords.length > 0 && (
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
                      <p className="text-white font-semibold">${payment.amount_paid.toFixed(2)} via {payment.payment_type.toUpperCase()}</p>
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
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={async () => {
            await handleMarkAsPaid()
            setShowPaymentModal(false)
          }}
        />
      )}
    </div>
  )
}

function PaymentModal({ invoice, onClose, onConfirm }: any) {
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
                <p className="text-2xl font-bold text-white">${invoice.amount.toFixed(2)} USDC</p>
              </div>
              <div className="glass rounded-lg p-4 border-orange-400/30">
                <p className="text-gray-400 text-sm mb-2">Estimated Gas Fee</p>
                <p className="text-white">${gasEstimate.toFixed(2)}</p>
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
                    <span className="text-white font-semibold">${invoice.amount.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Fee:</span>
                    <span className="text-white font-semibold">${gasEstimate.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-gray-300 font-semibold">Total:</span>
                    <span className="text-blue-400 font-bold text-lg">${(invoice.amount + gasEstimate).toFixed(2)}</span>
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
