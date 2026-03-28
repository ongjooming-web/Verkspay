'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { SUPPORTED_COUNTRIES, formatCurrency } from '@/lib/countries'
import { isMasterAccount } from '@/utils/isMasterAccount'

interface UserProfile {
  wallet_address?: string
  preferred_network?: string
  business_name?: string
  phone?: string
  stripe_onboarding_complete?: boolean
}

export default function Settings() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [countryCode, setCountryCode] = useState('MY')
  const [currencyCode, setCurrencyCode] = useState('MYR')
  const [formData, setFormData] = useState({
    full_name: '',
    wallet_address: '',
    preferred_network: 'base',
    business_name: '',
    business_email: '',
    business_phone: '',
    business_address: '',
    business_reg_number: '',
  })

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
        
        // Try to fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setCountryCode(profileData.country_code || 'MY')
          setCurrencyCode(profileData.currency_code || 'MYR')
          setFormData({
            full_name: profileData.full_name || '',
            wallet_address: profileData.wallet_address || '',
            preferred_network: profileData.preferred_network || 'base',
            business_name: profileData.business_name || '',
            business_email: profileData.business_email || '',
            business_phone: profileData.business_phone || '',
            business_address: profileData.business_address || '',
            business_reg_number: profileData.business_reg_number || '',
          })
        }
      }
      setLoading(false)
    }

    fetchUser()
  }, [])

  const handleSaveCurrency = async () => {
    if (!user) return
    
    try {
      setMessage('Saving currency preference...')
      
      const selectedCountry = SUPPORTED_COUNTRIES.find(c => c.code === countryCode)
      if (!selectedCountry) {
        setMessage('✗ Invalid country selected')
        return
      }

      console.log('[Settings] Saving currency:', { userId: user.id, countryCode, currencyCode: selectedCountry.currency })

      const { error } = await supabase
        .from('profiles')
        .update({
          country_code: countryCode,
          currency_code: selectedCountry.currency,
        })
        .eq('id', user.id)

      if (error) {
        console.error('[Settings] Supabase error:', error)
        throw error
      }

      setMessage('✓ Currency preference saved successfully!')
      setCurrencyCode(selectedCountry.currency)
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      console.error('[Settings] Error saving currency:', err.message || err)
      setMessage('✗ Failed to save currency preference: ' + (err.message || 'Unknown error'))
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setSaving(true)
    setMessage('')

    try {
      // Upsert to profiles table with all fields
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: formData.full_name,
          country_code: countryCode,
          wallet_address: formData.wallet_address,
          preferred_network: formData.preferred_network,
          business_name: formData.business_name,
          business_email: formData.business_email,
          business_phone: formData.business_phone,
          business_address: formData.business_address,
          business_reg_number: formData.business_reg_number,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'id'
        })

      if (error) {
        console.error('[Settings] Upsert error:', error)
        throw error
      }

      setMessage('✓ Business information saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('[Settings] Error saving profile:', err)
      setMessage('✗ Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    setSaving(true)
    try {
      // Delete user account
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) throw error

      // Sign out
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Error deleting account:', err)
      setMessage('✗ Failed to delete account')
      setSaving(false)
    }
  }

  const handleConnectStripe = async () => {
    if (!user) return

    try {
      setSaving(true)
      setMessage('Connecting to Stripe...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('✗ Session expired. Please refresh and try again.')
        setSaving(false)
        return
      }

      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.url
      } else {
        setMessage('✗ Failed to initiate Stripe connection')
        setSaving(false)
      }
    } catch (err) {
      console.error('Error connecting Stripe:', err)
      setMessage('✗ Connection error')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen relative z-10">
        <div className="glass px-8 py-6 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-gray-300">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent">
            ⚙️ Settings
          </h1>
          <Link href="/settings/account" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition">
            Account & Privacy →
          </Link>
        </div>

        {message && (
          <div className={`mb-6 glass px-4 py-3 rounded-lg ${message.startsWith('✓') ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-red-500/50 bg-red-500/10 text-red-300'}`}>
            {message}
          </div>
        )}

        {/* Account Settings */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Account Information</h2>
            <p className="text-gray-400 text-sm mt-1">Manage your account details</p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <div className="glass px-4 py-3 rounded-lg">
                <p className="text-white font-mono">{user?.email || 'N/A'}</p>
              </div>
              <p className="text-gray-400 text-xs mt-2">Your login email address</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
              <div className="glass px-4 py-3 rounded-lg overflow-x-auto">
                <p className="text-white font-mono text-xs break-all">{user?.id || 'N/A'}</p>
              </div>
              <p className="text-gray-400 text-xs mt-2">Unique identifier for your account</p>
            </div>
          </CardBody>
        </Card>

        {/* Localization Settings */}
        <Card className="mb-6 border-blue-500/30">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Localization</h2>
            <p className="text-gray-400 text-sm mt-1">Set your currency and location preferences</p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
              <select
                value={countryCode}
                onChange={(e) => {
                  const country = SUPPORTED_COUNTRIES.find(c => c.code === e.target.value)
                  if (country) {
                    setCountryCode(country.code)
                    setCurrencyCode(country.currency)
                  }
                }}
                className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
              >
                {SUPPORTED_COUNTRIES.map(country => (
                  <option key={country.code} value={country.code} style={{ color: '#000' }}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
              <p className="text-gray-400 text-xs mt-2">Select your primary location</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
              <div className="glass px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{currencyCode}</p>
                    <p className="text-gray-400 text-sm">
                      {SUPPORTED_COUNTRIES.find(c => c.code === countryCode)?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs mb-1">Preview:</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(1000, currencyCode)}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSaveCurrency}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition cursor-pointer w-full"
              >
                ✓ Save Currency Preference
              </button>
              <p className="text-gray-400 text-xs mt-2">All invoices and amounts will display in this currency</p>
            </div>
          </CardBody>
        </Card>

        {/* Profile Settings */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Your Profile</h2>
            <p className="text-gray-400 text-sm mt-1">Personalize how you appear to clients</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your name (e.g., John Doe)"
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                />
                <p className="text-gray-400 text-xs mt-2">This is how you'll be greeted on the dashboard and shown to clients</p>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Business Settings */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Business Information</h2>
            <p className="text-gray-400 text-sm mt-1">Update your business details</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">1) Business Name *</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Your business or freelance name"
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">2) Business Registration No</label>
                <input
                  type="text"
                  value={formData.business_reg_number}
                  onChange={(e) => setFormData({ ...formData, business_reg_number: e.target.value })}
                  placeholder="SSM number (e.g., 123456-X)"
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">3) Business Address</label>
                <textarea
                  value={formData.business_address}
                  onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                  placeholder="Street address, city, postal code"
                  rows={3}
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">4) Business Email Address</label>
                <input
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                  placeholder="contact@yourbusiness.com"
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">5) Phone Number</label>
                <input
                  type="tel"
                  value={formData.business_phone}
                  onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                  placeholder="+60 12-3456789"
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <Button type="submit" disabled={saving} className="w-full md:w-auto">
                  {saving ? '⏳ Saving...' : '✓ Save Changes'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Stripe Connect Setup */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">💳 Stripe Connect</h2>
            <p className="text-gray-400 text-sm mt-1">Accept payments and receive payouts</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-gray-300 text-sm mb-4">
                Connect your Stripe account to accept payments from clients. Once connected, you can generate payment links for your invoices and receive automatic payouts.
              </p>
              {profile?.stripe_onboarding_complete ? (
                <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-3 mb-4">
                  <p className="text-green-300 font-semibold">✓ Stripe Connected</p>
                  <p className="text-gray-400 text-sm mt-1">Your account is ready to accept payments</p>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 mb-4">
                  <p className="text-amber-300 font-semibold">⚠ Not Connected</p>
                  <p className="text-gray-400 text-sm mt-1">Set up Stripe to start accepting payments</p>
                </div>
              )}
              <Button 
                onClick={handleConnectStripe}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {profile?.stripe_onboarding_complete ? '🔄 Manage Stripe Account' : '🔗 Connect Stripe'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Webhook Configuration (Step 2 Foundation) */}
        <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">🔔 Payment Detection (Coming Soon)</h2>
            <p className="text-gray-400 text-sm mt-1">Automatic payment confirmation via webhooks</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="glass rounded-lg p-4 border-blue-400/30">
              <p className="text-blue-300 text-sm mb-3">
                <strong>Phase 3 Step 2:</strong> This feature will automatically confirm USDC payments using Alchemy webhooks.
              </p>
              <ul className="text-gray-300 text-sm space-y-2 ml-4 list-disc">
                <li>Real-time payment notifications</li>
                <li>Automatic invoice status updates</li>
                <li>Transaction history tracking</li>
              </ul>
            </div>
            <Button disabled className="w-full md:w-auto opacity-50 cursor-not-allowed">
              🔒 Coming Soon - Phase 3 Step 2
            </Button>
          </CardBody>
        </Card>

        {/* Billing Section */}
        <BillingSection />

        {/* Danger Zone */}
        <Card className="border-red-500/30 bg-gradient-to-r from-red-500/5 to-red-500/10">
          <CardHeader className="border-b border-red-500/20">
            <h2 className="text-2xl font-bold text-red-400">⚠️ Danger Zone</h2>
            <p className="text-red-300/70 text-sm mt-1">Irreversible actions</p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <h3 className="font-bold text-white mb-2">Delete Your Account</h3>
              <p className="text-gray-400 text-sm mb-4">
                Permanently delete your account and all associated data (clients, invoices, proposals). This action cannot be undone.
              </p>
              <Button 
                onClick={handleDeleteAccount}
                disabled={saving}
                variant="outline" 
                className="border-red-500/50 text-red-400 hover:border-red-400/80 hover:text-red-300 hover:bg-red-500/10"
              >
                {saving ? '⏳ Deleting...' : '🗑 Delete Account'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

/**
 * Billing Section Component
 */
function BillingSection() {
  const [profile, setProfile] = useState<any>(null)
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [paymentLinkCount, setPaymentLinkCount] = useState(0)
  const [aiInsightsCount, setAiInsightsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('[BillingSection] Auth error:', authError)
        setLoading(false)
        return
      }

      const userId = user.id
      const userEmailValue = user.email || ''
      setUserEmail(userEmailValue)
      console.log('[BillingSection] Loaded user:', userId, userEmailValue)

      // Get full profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('plan, subscription_status, trial_end_date')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('[BillingSection] Profile error:', profileError)
        console.error('[BillingSection] Failed to fetch profile for user:', userId)
        
        // If profile doesn't exist, create one with defaults
        if (profileError.code === 'PGRST116') {
          console.log('[BillingSection] Profile not found, creating default profile')
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: user.email,
              plan: 'trial',
              subscription_status: 'active',
              trial_end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (createError) {
            console.error('[BillingSection] Failed to create default profile:', createError)
          } else {
            console.log('[BillingSection] Default profile created')
            // Set default profile
            setProfile({
              plan: 'trial',
              subscription_status: 'active',
              trial_end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
            })
          }
        }
      } else {
        console.log('[BillingSection] Profile loaded:', { 
          plan: profileData?.plan, 
          status: profileData?.subscription_status,
          trialEndDate: profileData?.trial_end_date 
        })
        setProfile(profileData)
      }

      // Count invoices this month
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const { count: invCount, error: invError } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString())

      if (invError) {
        console.error('[BillingSection] Invoice count error:', invError)
      } else {
        setInvoiceCount(invCount || 0)
      }

      // Count payment links this month (invoices with a stripe_payment_session_id)
      const { count: linkCount, error: linkError } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('stripe_payment_session_id', 'is', null)
        .gte('created_at', monthStart.toISOString())

      if (linkError) {
        console.error('[BillingSection] Payment link count error:', linkError)
        console.error('[BillingSection] Error details:', { 
          message: linkError.message,
          code: linkError.code,
          details: linkError.details 
        })
        setPaymentLinkCount(0)
      } else {
        console.log('[BillingSection] Payment links counted:', linkCount)
        setPaymentLinkCount(linkCount || 0)
      }

      // For now, AI insights count is placeholder (will update when we have tracking)
      setAiInsightsCount(0)
    } catch (err) {
      console.error('[BillingSection] Error loading billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan: 'starter' | 'pro' | 'enterprise') => {
    try {
      console.log('[BillingSection] Starting upgrade for plan:', plan)
      
      // Refresh session to ensure token is valid
      console.log('[BillingSection] Refreshing session...')
      await supabase.auth.refreshSession()
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('[BillingSection] Session error:', sessionError)
        alert('❌ Session expired. Please refresh the page and try again.')
        return
      }

      const token = session.access_token
      console.log('[BillingSection] Token available:', !!token)
      console.log('[BillingSection] Calling checkout endpoint...')
      
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan, billingPeriod })
      })

      console.log('[BillingSection] Response status:', response.status)

      const data = await response.json()
      
      console.log('[BillingSection] Response data:', data)

      if (!response.ok) {
        alert(`❌ Error: ${data.error || 'Failed to create checkout session'}`)
        return
      }

      if (data.url) {
        console.log('[BillingSection] Redirecting to:', data.url)
        window.location.href = data.url
      } else {
        alert('❌ No checkout URL returned')
      }
    } catch (err: any) {
      console.error('[BillingSection] Error upgrading:', err)
      alert(`❌ Error: ${err.message || 'Failed to start upgrade'}`)
    }
  }

  const handleManageSubscription = async () => {
    try {
      // Refresh session first
      await supabase.auth.refreshSession()
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        console.error('[BillingSection] Session error:', sessionError)
        alert('❌ Session expired. Please refresh the page and try again.')
        return
      }

      const token = session.access_token

      const response = await fetch('/api/billing/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`❌ Error: ${data.error || 'Failed to open billing portal'}`)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('[BillingSection] Error opening portal:', err)
      alert(`❌ Error: ${err.message || 'Failed to open billing portal'}`)
    }
  }

  if (loading) {
    return (
      <Card className="mb-6 border-blue-500/30">
        <CardBody>
          <div className="animate-pulse">Loading billing info...</div>
        </CardBody>
      </Card>
    )
  }

  const tier = profile?.plan || 'trial'
  const isMaster = isMasterAccount(userEmail)
  
  // Plan configuration
  const plans = [
    { id: 'starter', name: 'Starter', monthlyPrice: 19, annualPrice: 15, features: 'Up to 20 invoices, Payment links, Stripe, Smart Reminders, WhatsApp, AI Insights, Reports' },
    { id: 'pro', name: 'Pro', monthlyPrice: 49, annualPrice: 39, features: 'Everything in Starter, plus: Unlimited invoices, Partial payments, Recurring, Proposals, 30 AI Insights, AI Summaries' },
    { id: 'enterprise', name: 'Enterprise', monthlyPrice: 89, annualPrice: 71, features: 'Everything in Pro, plus: 100 AI Insights, 100 Summaries, Revenue Forecasting, Team mgmt' }
  ]

  // Calculate trial days remaining
  const trialEndDate = profile?.trial_end_date
  const trialDaysRemaining = trialEndDate 
    ? Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  // Get limits for current tier
  const getLimits = (t: string) => {
    if (isMaster) return { invoices: Infinity, links: Infinity, insights: Infinity }
    switch (t) {
      case 'trial': return { invoices: 5, links: 3, insights: 5 }
      case 'starter': return { invoices: 20, links: 10, insights: 5 }
      case 'pro': return { invoices: Infinity, links: Infinity, insights: 30 }
      case 'enterprise': return { invoices: Infinity, links: Infinity, insights: Infinity }
      default: return { invoices: 5, links: 3, insights: 5 }
    }
  }

  const limits = getLimits(tier)

  // Get status badge
  const getStatusBadge = () => {
    if (isMaster) return { label: 'Master', color: 'bg-purple-500' }
    if (tier === 'trial' && trialDaysRemaining <= 3) return { label: 'Expiring Soon', color: 'bg-yellow-500' }
    if (tier === 'trial' && trialDaysRemaining < 0) return { label: 'Expired', color: 'bg-red-500' }
    return { label: 'Active', color: 'bg-green-500' }
  }

  const statusBadge = getStatusBadge()

  return (
    <Card className="mb-6 border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <CardHeader>
        <h2 className="text-2xl font-bold text-white">💳 Subscription & Billing</h2>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Current Plan Display */}
        <div className="glass rounded-lg p-6 border-blue-400/30">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-4xl font-bold text-blue-400">
                  {isMaster ? 'Enterprise (Master)' : plans.find(p => p.id === tier)?.name || 'Trial'}
                </h3>
                <span className={`${statusBadge.color} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                  {statusBadge.label}
                </span>
              </div>
              {tier === 'trial' && !isMaster && (
                <p className="text-yellow-300 text-sm font-semibold">
                  ⏱️  {trialDaysRemaining > 0 ? `${trialDaysRemaining} days remaining` : 'Trial expired'}
                </p>
              )}
              {tier !== 'trial' && (
                <p className="text-gray-400 text-sm">Billing monthly • Next billing in 30 days</p>
              )}
            </div>
          </div>
        </div>

        {/* Plan Comparison Grid */}
        <div className="space-y-3">
          <p className="text-gray-400 text-sm font-semibold">Compare Plans</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-lg p-4 border transition ${
                  tier === plan.id
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="mb-3">
                  <h4 className="text-white font-bold text-base md:text-sm">{plan.name}</h4>
                  <p className="text-gray-400 text-xs mt-2 line-clamp-3">{plan.features}</p>
                </div>
                <p className="text-3xl md:text-2xl font-bold text-blue-300 mb-3">
                  ${billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                  <span className="text-sm text-gray-400">/mo</span>
                </p>
                {tier === plan.id ? (
                  <div className="text-xs font-semibold text-green-400 px-3 py-2 rounded bg-green-500/10 border border-green-500/20 text-center">
                    ✓ Current Plan
                  </div>
                ) : tier === 'trial' ? (
                  <Button
                    onClick={() => handleUpgrade(plan.id as 'starter' | 'pro' | 'enterprise')}
                    className="w-full text-xs py-2 bg-blue-600 hover:bg-blue-700"
                  >
                    Choose
                  </Button>
                ) : plan.id === 'enterprise' || (tier === 'starter' && plan.id === 'pro') || (tier === 'pro' && plan.id === 'enterprise') ? (
                  <Button
                    onClick={() => handleUpgrade(plan.id as 'starter' | 'pro' | 'enterprise')}
                    className="w-full text-xs py-2 bg-purple-600 hover:bg-purple-700"
                  >
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.id as 'starter' | 'pro' | 'enterprise')}
                    className="w-full text-xs py-2 bg-gray-600 hover:bg-gray-700"
                  >
                    Change Plan
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Billing Period Selector */}
        <div className="space-y-3">
          <p className="text-gray-400 text-sm font-semibold">Billing Period</p>
          <div className="flex gap-3">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-sm ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:border-white/20'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-sm relative ${
                billingPeriod === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:border-white/20'
              }`}
            >
              Annual
              {billingPeriod === 'annual' && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Usage Summary */}
        <div className="space-y-3">
          <p className="text-gray-400 text-sm font-semibold">Usage This Month</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-lg p-3 border-white/10">
              <p className="text-white text-sm font-bold">
                {limits.invoices === Infinity ? '∞' : `${invoiceCount}/${limits.invoices}`}
              </p>
              <p className="text-gray-400 text-xs mt-1">Invoices</p>
            </div>
            <div className="glass rounded-lg p-3 border-white/10">
              <p className="text-white text-sm font-bold">
                {limits.links === Infinity ? '∞' : `${paymentLinkCount}/${limits.links}`}
              </p>
              <p className="text-gray-400 text-xs mt-1">Payment Links</p>
            </div>
            <div className="glass rounded-lg p-3 border-white/10">
              <p className="text-white text-sm font-bold">
                {limits.insights === Infinity ? '∞' : `${aiInsightsCount}/${limits.insights}`}
              </p>
              <p className="text-gray-400 text-xs mt-1">AI Insights</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {tier === 'trial' && (
            <Button
              onClick={() => handleUpgrade('starter')}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 font-semibold py-3"
            >
              🚀 Choose a Plan
            </Button>
          )}
          {tier !== 'trial' && !isMaster && (
            <Button
              onClick={handleManageSubscription}
              className="flex-1 bg-blue-600/70 hover:bg-blue-700/70 text-white py-3"
            >
              📋 Manage Billing
            </Button>
          )}
          {isMaster && (
            <div className="flex-1 glass rounded-lg p-3 border-purple-400/30 text-center">
              <p className="text-purple-300 text-xs font-semibold">Master test account</p>
              <p className="text-gray-400 text-xs mt-1">All features unlocked</p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
