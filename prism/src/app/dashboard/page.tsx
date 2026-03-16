'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navigation } from '@/components/Navigation'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import Link from 'next/link'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    revenue: 0,
    clientCount: 0,
    invoiceCount: 0,
    proposalCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
        // TODO: Fetch real stats from database
        setStats({
          revenue: 12450,
          clientCount: 8,
          invoiceCount: 24,
          proposalCount: 5,
        })
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.email?.split('@')[0]}!</h1>
          <p className="text-gray-600">Here's your business overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white">
            <CardBody>
              <div className="text-gray-600 text-sm font-medium mb-2">Total Revenue</div>
              <div className="text-3xl font-bold text-gray-900">${stats.revenue.toLocaleString()}</div>
              <div className="text-green-600 text-sm mt-2">+12% from last month</div>
            </CardBody>
          </Card>

          <Card className="bg-white">
            <CardBody>
              <div className="text-gray-600 text-sm font-medium mb-2">Active Clients</div>
              <div className="text-3xl font-bold text-gray-900">{stats.clientCount}</div>
              <div className="text-blue-600 text-sm mt-2">+2 new this month</div>
            </CardBody>
          </Card>

          <Card className="bg-white">
            <CardBody>
              <div className="text-gray-600 text-sm font-medium mb-2">Invoices</div>
              <div className="text-3xl font-bold text-gray-900">{stats.invoiceCount}</div>
              <div className="text-orange-600 text-sm mt-2">3 pending payment</div>
            </CardBody>
          </Card>

          <Card className="bg-white">
            <CardBody>
              <div className="text-gray-600 text-sm font-medium mb-2">Proposals</div>
              <div className="text-3xl font-bold text-gray-900">{stats.proposalCount}</div>
              <div className="text-purple-600 text-sm mt-2">2 awaiting response</div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white">
            <CardHeader>
              <h2 className="text-xl font-bold">Quick Actions</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Link href="/clients" className="block">
                <Button variant="outline" className="w-full text-left">
                  → Add New Client
                </Button>
              </Link>
              <Link href="/invoices" className="block">
                <Button variant="outline" className="w-full text-left">
                  → Create Invoice
                </Button>
              </Link>
              <Link href="/proposals" className="block">
                <Button variant="outline" className="w-full text-left">
                  → Send Proposal
                </Button>
              </Link>
            </CardBody>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <h2 className="text-xl font-bold">Recent Activity</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="py-2 border-b border-gray-200">
                <div className="font-medium text-gray-900">Invoice INV-001 sent</div>
                <div className="text-gray-600">2 hours ago</div>
              </div>
              <div className="py-2 border-b border-gray-200">
                <div className="font-medium text-gray-900">Client Acme Corp added</div>
                <div className="text-gray-600">Yesterday</div>
              </div>
              <div className="py-2">
                <div className="font-medium text-gray-900">Proposal PRO-001 accepted</div>
                <div className="text-gray-600">3 days ago</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
