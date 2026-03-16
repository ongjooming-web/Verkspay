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
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Account Settings */}
        <Card className="bg-white mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold">Account Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <input
                type="text"
                value={user?.id || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
              />
            </div>
          </CardBody>
        </Card>

        {/* Billing */}
        <Card className="bg-white mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold">Billing & Plan</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center py-4 border-b border-gray-200">
              <div>
                <h3 className="font-medium text-gray-900">Current Plan</h3>
                <p className="text-gray-600 text-sm">Pro - $29/month</p>
              </div>
              <Button variant="outline">Change Plan</Button>
            </div>
            <div className="py-4">
              <h3 className="font-medium text-gray-900 mb-2">Plan Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ Unlimited clients</li>
                <li>✓ Unlimited invoices</li>
                <li>✓ Proposal management</li>
                <li>✓ Contract templates</li>
                <li>✓ Email notifications</li>
              </ul>
            </div>
          </CardBody>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-white border-red-200">
          <CardHeader className="border-b border-red-200">
            <h2 className="text-xl font-bold text-red-600">Danger Zone</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="text-gray-600 mb-4">Delete your account and all associated data. This action cannot be undone.</p>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                Delete Account
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
