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
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="glass px-8 py-6 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-gray-300">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent mb-3">
            Welcome back, {user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-gray-400 text-lg">Here's your business overview at a glance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="hover:scale-105 hover:border-blue-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Total Revenue</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ${stats.revenue.toLocaleString()}
              </div>
              <div className="text-green-400 text-sm mt-3 flex items-center gap-1">
                ↑ +12% from last month
              </div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-green-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Active Clients</div>
              <div className="text-4xl font-bold text-green-400">{stats.clientCount}</div>
              <div className="text-green-500 text-sm mt-3">+2 new this month</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-yellow-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Invoices</div>
              <div className="text-4xl font-bold text-yellow-400">{stats.invoiceCount}</div>
              <div className="text-orange-400 text-sm mt-3">3 pending payment</div>
            </CardBody>
          </Card>

          <Card className="hover:scale-105 hover:border-purple-400/50">
            <CardBody>
              <div className="text-gray-400 text-sm font-medium mb-3">Proposals</div>
              <div className="text-4xl font-bold text-purple-400">{stats.proposalCount}</div>
              <div className="text-purple-400 text-sm mt-3">2 awaiting response</div>
            </CardBody>
          </Card>
        </div>

        {/* Quick Actions & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <h2 className="text-xl font-bold text-white">Quick Actions</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <Link href="/clients" className="block">
                <Button variant="outline" className="w-full justify-start hover:translate-x-1">
                  <span className="mr-2">👥</span> Add New Client
                </Button>
              </Link>
              <Link href="/invoices" className="block">
                <Button variant="outline" className="w-full justify-start hover:translate-x-1">
                  <span className="mr-2">📄</span> Create Invoice
                </Button>
              </Link>
              <Link href="/proposals" className="block">
                <Button variant="outline" className="w-full justify-start hover:translate-x-1">
                  <span className="mr-2">📝</span> Send Proposal
                </Button>
              </Link>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📊</span> Recent Activity
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="py-3 border-b border-white/10 hover:bg-white/5 rounded px-2 transition-colors">
                <div className="font-medium text-white flex items-center gap-2">
                  <span className="text-lg">✓</span> Invoice INV-001 sent
                </div>
                <div className="text-gray-400 text-sm mt-1">2 hours ago</div>
              </div>
              <div className="py-3 border-b border-white/10 hover:bg-white/5 rounded px-2 transition-colors">
                <div className="font-medium text-white flex items-center gap-2">
                  <span className="text-lg">👤</span> Client Acme Corp added
                </div>
                <div className="text-gray-400 text-sm mt-1">Yesterday</div>
              </div>
              <div className="py-3 hover:bg-white/5 rounded px-2 transition-colors">
                <div className="font-medium text-white flex items-center gap-2">
                  <span className="text-lg">🎉</span> Proposal PRO-001 accepted
                </div>
                <div className="text-gray-400 text-sm mt-1">3 days ago</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
