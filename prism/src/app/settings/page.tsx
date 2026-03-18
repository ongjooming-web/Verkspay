'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { WalletConnectComponent } from '@/components/WalletConnect'
import { StripeConnectComponent } from '@/components/StripeConnect'

interface UserProfile {
  wallet_address?: string
  preferred_network?: string
  business_name?: string
  phone?: string
}

export default function Settings() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    wallet_address: '',
    preferred_network: 'base',
    business_name: '',
    phone: '',
  })

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
        
        // Try to fetch user profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setFormData({
            wallet_address: profileData.wallet_address || '',
            preferred_network: profileData.preferred_network || 'base',
            business_name: profileData.business_name || '',
            phone: profileData.phone || '',
          })
        }
      }
      setLoading(false)
    }

    fetchUser()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setSaving(true)
    setMessage('')

    try {
      // Check if profile exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_profiles')
          .update({
            wallet_address: formData.wallet_address,
            preferred_network: formData.preferred_network,
            business_name: formData.business_name,
            phone: formData.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('user_profiles')
          .insert([
            {
              user_id: user.id,
              wallet_address: formData.wallet_address,
              preferred_network: formData.preferred_network,
              business_name: formData.business_name,
              phone: formData.phone,
            },
          ])

        if (error) throw error
      }

      setMessage('✓ Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Error saving profile:', err)
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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent mb-10">
          ⚙️ Settings
        </h1>

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

        {/* Business Settings */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Business Information</h2>
            <p className="text-gray-400 text-sm mt-1">Update your business details</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Name</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Your business or freelance name"
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(optional)"
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

        {/* Payment Methods */}
        <div className="mb-6 space-y-6">
          {/* Stripe Payments */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Payment Methods</h2>
            <StripeConnectComponent 
              onStripeConnected={(accountId) => {
                console.log('Stripe connected:', accountId)
              }}
            />
          </div>

          {/* Wallet Connection */}
          <div>
            <WalletConnectComponent 
              onWalletConnected={(address) => {
                console.log('Wallet connected:', address)
              }}
            />
          </div>
        </div>

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return

      // Get profile with subscription info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', userData.user.id)
        .single()

      setProfile(profileData)

      // Count invoices this month
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const { data: invoices, count: invCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .gte('created_at', monthStart.toISOString())

      setInvoiceCount(invCount || 0)

      // Count payment links this month
      const { data: links, count: linkCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .eq('stripe_payment_session_id IS NOT', null)
        .gte('payment_link_generated_at', monthStart.toISOString())

      setPaymentLinkCount(linkCount || 0)
    } catch (err) {
      console.error('Error loading billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        alert('Session expired. Please refresh and try again.')
        return
      }

      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Error upgrading:', err)
      alert('Failed to start upgrade. Please try again.')
    }
  }

  const handleManageSubscription = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        alert('Session expired. Please refresh and try again.')
        return
      }

      const response = await fetch('/api/billing/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Error opening portal:', err)
      alert('Failed to open billing portal. Please try again.')
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

  const tier = profile?.subscription_tier || 'free'
  const tierDisplay = tier.charAt(0).toUpperCase() + tier.slice(1)
  const invoiceLimit = tier === 'free' ? 5 : Infinity
  const linkLimit = tier === 'free' ? 3 : Infinity

  return (
    <Card className="mb-6 border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
      <CardHeader>
        <h2 className="text-2xl font-bold text-white">💳 Subscription</h2>
      </CardHeader>
      <CardBody className="space-y-6">
        {/* Current Plan */}
        <div className="glass rounded-lg p-4 border-blue-400/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Plan</p>
              <p className="text-2xl font-bold text-blue-400">{tierDisplay}</p>
              {tier !== 'free' && (
                <p className="text-gray-400 text-sm mt-2">
                  Status: <span className="text-green-400 font-semibold capitalize">{profile?.subscription_status || 'active'}</span>
                </p>
              )}
            </div>
            {tier === 'free' && (
              <Button
                onClick={() => handleUpgrade('pro')}
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 whitespace-nowrap"
              >
                Upgrade →
              </Button>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        {tier === 'free' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-semibold">Usage This Month</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-lg p-3 border-yellow-400/30 bg-yellow-500/10">
                <p className="text-yellow-300 text-sm font-semibold">{invoiceCount}/5</p>
                <p className="text-gray-400 text-xs">Invoices</p>
              </div>
              <div className="glass rounded-lg p-3 border-yellow-400/30 bg-yellow-500/10">
                <p className="text-yellow-300 text-sm font-semibold">{paymentLinkCount}/3</p>
                <p className="text-gray-400 text-xs">Payment Links</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          {tier === 'free' && (
            <>
              <Button
                onClick={() => handleUpgrade('pro')}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"
              >
                Upgrade to Pro - $49/mo
              </Button>
              <Button
                onClick={() => handleUpgrade('enterprise')}
                variant="outline"
                className="flex-1 border-purple-400/50 text-purple-300 hover:bg-purple-500/10"
              >
                Enterprise - $199/mo
              </Button>
            </>
          )}

          {tier !== 'free' && (
            <Button
              onClick={handleManageSubscription}
              className="w-full bg-blue-600/70 hover:bg-blue-700/70 text-white"
            >
              📋 Manage Subscription
            </Button>
          )}
        </div>

        {/* Info */}
        <p className="text-gray-400 text-xs">
          {tier === 'free'
            ? 'Free tier limited to 5 invoices and 3 payment links per month.'
            : 'You have access to all Pro features including unlimited invoices and payment links.'}
        </p>
      </CardBody>
    </Card>
  )
}
