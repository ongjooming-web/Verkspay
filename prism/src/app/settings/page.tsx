'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { WalletConnectComponent } from '@/components/WalletConnect'

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

        {/* Billing */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">Billing & Plan</h2>
            <p className="text-gray-400 text-sm mt-1">View and manage your subscription</p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex justify-between items-center py-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-lg">Current Plan</h3>
                <p className="text-gray-400 text-sm">Free Plan</p>
              </div>
              <span className="text-blue-400 font-semibold">$0/month</span>
            </div>
            <div className="py-4">
              <h3 className="font-bold text-white mb-4">Plan Features</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-lg">✓</span>
                  <span className="text-gray-300">Unlimited clients</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-lg">✓</span>
                  <span className="text-gray-300">Unlimited invoices</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-lg">✓</span>
                  <span className="text-gray-300">Proposal management</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-lg">✓</span>
                  <span className="text-gray-300">Contract templates</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-lg">✓</span>
                  <span className="text-gray-300">USDC crypto payments</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-lg">✓</span>
                  <span className="text-gray-300">Email notifications</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Wallet Connection */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">💰 USDC Wallet Connection</h2>
            <p className="text-gray-400 text-sm mt-1">Connect your wallet to receive USDC payments</p>
          </CardHeader>
          <CardBody>
            <WalletConnectComponent 
              onWalletConnected={(address, network) => {
                console.log('Wallet connected:', address, network)
              }}
              onWalletDisconnected={() => {
                console.log('Wallet disconnected')
              }}
            />
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
