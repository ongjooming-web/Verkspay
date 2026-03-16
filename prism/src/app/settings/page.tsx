'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'

export default function Settings() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
      }
      setLoading(false)
    }

    fetchUser()
  }, [])

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
                <p className="text-white font-mono text-xs">{user?.id || 'N/A'}</p>
              </div>
              <p className="text-gray-400 text-xs mt-2">Unique identifier for your account</p>
            </div>
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
                <p className="text-gray-400 text-sm">Pro - $29/month</p>
              </div>
              <Button variant="secondary" className="whitespace-nowrap">
                Change Plan
              </Button>
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

        {/* Crypto Wallet Settings */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white">💰 Crypto Settings</h2>
            <p className="text-gray-400 text-sm mt-1">Configure your USDC payment wallet</p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30"
              />
              <p className="text-gray-400 text-xs mt-2">Your Ethereum/Polygon wallet for receiving USDC</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Network</label>
              <select className="glass px-4 py-3 rounded-lg text-white w-full focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/30 appearance-none">
                <option className="bg-slate-900">Base (Recommended)</option>
                <option className="bg-slate-900">Ethereum</option>
                <option className="bg-slate-900">Polygon</option>
              </select>
              <p className="text-gray-400 text-xs mt-2">Network where you'll receive payments</p>
            </div>
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
                variant="outline" 
                className="border-red-500/50 text-red-400 hover:border-red-400/80 hover:text-red-300 hover:bg-red-500/10"
              >
                🗑 Delete Account
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
