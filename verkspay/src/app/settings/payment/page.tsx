'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'

const MALAYSIAN_BANKS = [
  'Maybank',
  'CIMB Bank',
  'Public Bank',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Islam',
  'Bank Rakyat',
  'Bank Muamalat',
  'Affin Bank',
  'Alliance Bank',
  'OCBC Bank',
  'Standard Chartered',
  'HSBC Bank',
  'UOB Bank',
  'Citibank',
  'BSN (Bank Simpanan Nasional)',
  'Agrobank',
  'Bank Pembangunan',
  'MBSB Bank',
  'KFH (Kuwait Finance House)',
  'Other (specify)',
]

interface PaymentSettings {
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  duitnow_id: string
  payment_instructions: string
}

interface FormErrors {
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  payment_instructions?: string
}

export default function PaymentSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [showCustomBankInput, setShowCustomBankInput] = useState(false)
  const [customBankName, setCustomBankName] = useState('')

  const [formData, setFormData] = useState<PaymentSettings>({
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    duitnow_id: '',
    payment_instructions: '',
  })

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) {
        router.push('/login')
        return
      }

      setUser(data.user)

      // Fetch existing payment settings
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('bank_name, bank_account_number, bank_account_name, duitnow_id, payment_instructions')
        .eq('id', data.user.id)
        .single()

      if (profileData) {
        setFormData(profileData)
        if (profileData.bank_name === 'Other (specify)') {
          setShowCustomBankInput(true)
        }
      }

      setLoading(false)
    }

    fetchUser()
  }, [router])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Bank Name
    if (!formData.bank_name || formData.bank_name.trim() === '') {
      newErrors.bank_name = 'Bank name is required'
    }

    // Account Number - numbers only, min 8 digits
    if (!formData.bank_account_number || formData.bank_account_number.trim() === '') {
      newErrors.bank_account_number = 'Account number is required'
    } else if (!/^\d+$/.test(formData.bank_account_number.trim())) {
      newErrors.bank_account_number = 'Account number must contain only numbers'
    } else if (formData.bank_account_number.trim().length < 8) {
      newErrors.bank_account_number = 'Account number must be at least 8 digits'
    }

    // Account Name
    if (!formData.bank_account_name || formData.bank_account_name.trim() === '') {
      newErrors.bank_account_name = 'Account name is required'
    }

    // Payment Instructions - max 500 characters
    if (formData.payment_instructions && formData.payment_instructions.length > 500) {
      newErrors.payment_instructions = 'Payment instructions must not exceed 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFormData({ ...formData, bank_name: value })

    if (value === 'Other (specify)') {
      setShowCustomBankInput(true)
    } else {
      setShowCustomBankInput(false)
      setCustomBankName('')
    }
  }

  const handleCustomBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomBankName(value)
    setFormData({ ...formData, bank_name: value })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors({ ...errors, [name]: undefined })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSaving(true)
    setSuccessMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          bank_account_name: formData.bank_account_name,
          duitnow_id: formData.duitnow_id || null,
          payment_instructions: formData.payment_instructions || null,
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error saving payment settings:', error)
        setErrors({ bank_name: 'Failed to save payment settings. Please try again.' })
      } else {
        setSuccessMessage('✅ Payment settings saved successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (err) {
      console.error('Error:', err)
      setErrors({ bank_name: 'An unexpected error occurred. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-gray-300">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">💳 Payment Settings</h1>
          <p className="text-gray-400">Configure your bank details for client payments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardBody>
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Bank Name */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Bank Name *</label>
                    <select
                      value={formData.bank_name === 'Other (specify)' ? 'Other (specify)' : formData.bank_name}
                      onChange={handleBankChange}
                      className={`w-full px-4 py-2 glass rounded-lg text-white focus:outline-none focus:ring-2 transition ${
                        errors.bank_name ? 'focus:ring-red-500/50 border border-red-500/30' : 'focus:ring-blue-500/50'
                      }`}
                    >
                      <option value="">Select a bank...</option>
                      {MALAYSIAN_BANKS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                    {errors.bank_name && <p className="text-red-400 text-sm mt-1">{errors.bank_name}</p>}
                  </div>

                  {/* Custom Bank Input */}
                  {showCustomBankInput && (
                    <div>
                      <label className="block text-white font-semibold mb-2">Bank Name (Custom) *</label>
                      <input
                        type="text"
                        placeholder="Enter your bank name"
                        value={customBankName}
                        onChange={handleCustomBankChange}
                        className="w-full px-4 py-2 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  )}

                  {/* Account Number */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Account Number *</label>
                    <input
                      type="text"
                      name="bank_account_number"
                      placeholder="e.g., 5641915877"
                      value={formData.bank_account_number}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition ${
                        errors.bank_account_number ? 'focus:ring-red-500/50 border border-red-500/30' : 'focus:ring-blue-500/50'
                      }`}
                    />
                    <p className="text-gray-400 text-xs mt-1">Numbers only, minimum 8 digits</p>
                    {errors.bank_account_number && <p className="text-red-400 text-sm mt-1">{errors.bank_account_number}</p>}
                  </div>

                  {/* Account Name */}
                  <div>
                    <label className="block text-white font-semibold mb-2">Account Name *</label>
                    <input
                      type="text"
                      name="bank_account_name"
                      placeholder="e.g., Tria Ventures"
                      value={formData.bank_account_name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition ${
                        errors.bank_account_name ? 'focus:ring-red-500/50 border border-red-500/30' : 'focus:ring-blue-500/50'
                      }`}
                    />
                    {errors.bank_account_name && <p className="text-red-400 text-sm mt-1">{errors.bank_account_name}</p>}
                  </div>

                  {/* DuitNow ID */}
                  <div>
                    <label className="block text-white font-semibold mb-2">DuitNow ID (Optional)</label>
                    <input
                      type="text"
                      name="duitnow_id"
                      placeholder="e.g., 012-3456789 or MyKad/Registration number"
                      value={formData.duitnow_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <p className="text-gray-400 text-xs mt-1">Phone number, MyKad, or business registration number</p>
                  </div>

                  {/* Payment Instructions */}
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Payment Instructions (Optional)
                      <span className="text-gray-400 text-sm ml-2">
                        ({formData.payment_instructions.length}/500)
                      </span>
                    </label>
                    <textarea
                      name="payment_instructions"
                      placeholder="e.g., Please include invoice number in reference. Processing time: 1-2 business days."
                      value={formData.payment_instructions}
                      onChange={handleInputChange}
                      maxLength={500}
                      rows={4}
                      className={`w-full px-4 py-2 glass rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition resize-none ${
                        errors.payment_instructions ? 'focus:ring-red-500/50 border border-red-500/30' : 'focus:ring-blue-500/50'
                      }`}
                    />
                    {errors.payment_instructions && (
                      <p className="text-red-400 text-sm mt-1">{errors.payment_instructions}</p>
                    )}
                  </div>

                  {/* Success Message */}
                  {successMessage && (
                    <div className="glass rounded-lg p-4 border-green-500/30 bg-green-500/10">
                      <p className="text-green-300">{successMessage}</p>
                    </div>
                  )}

                  {/* Save Button */}
                  <Button
                    type="submit"
                    disabled={saving}
                    className={`w-full py-3 font-semibold rounded-lg transition ${
                      saving
                        ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                    }`}
                  >
                    {saving ? 'Saving...' : '💾 Save Payment Details'}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <h3 className="text-lg font-bold text-white">📋 Preview</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="text-sm text-gray-400">How this appears on invoices and payment reminders:</div>

                {/* Bank Transfer Section */}
                {formData.bank_account_number && (
                  <div className="glass rounded-lg p-3 border-blue-400/30 bg-blue-500/10">
                    <p className="text-blue-300 text-sm font-semibold mb-2">🏦 Bank Transfer</p>
                    <div className="space-y-1 text-xs text-gray-300">
                      <p>
                        <span className="text-gray-400">Bank:</span> {formData.bank_name || '(bank name)'}
                      </p>
                      <p>
                        <span className="text-gray-400">Account:</span> {formData.bank_account_number || '(account number)'}
                      </p>
                      <p>
                        <span className="text-gray-400">Name:</span> {formData.bank_account_name || '(account name)'}
                      </p>
                      {formData.duitnow_id && (
                        <p className="text-gray-400 text-xs mt-2">Reference: INV-XXXX</p>
                      )}
                    </div>
                  </div>
                )}

                {/* DuitNow Section */}
                {formData.duitnow_id && (
                  <div className="glass rounded-lg p-3 border-purple-400/30 bg-purple-500/10">
                    <p className="text-purple-300 text-sm font-semibold mb-2">⚡ DuitNow</p>
                    <p className="text-gray-300 text-xs">{formData.duitnow_id}</p>
                  </div>
                )}

                {/* Instructions Section */}
                {formData.payment_instructions && (
                  <div className="glass rounded-lg p-3 border-amber-400/30 bg-amber-500/10">
                    <p className="text-amber-300 text-sm font-semibold mb-2">📝 Instructions</p>
                    <p className="text-gray-300 text-xs">{formData.payment_instructions}</p>
                  </div>
                )}

                {!formData.bank_account_number && (
                  <div className="text-center text-gray-400 text-xs py-4">
                    <p>Fill in the form to see preview</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
