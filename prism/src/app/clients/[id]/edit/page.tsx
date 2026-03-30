'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Card, CardBody, CardHeader } from '@/components/Card'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  industry?: string
}

export default function EditClient() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [formData, setFormData] = useState<Client>({
    id: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/login')
          return
        }

        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .eq('user_id', user.id)
          .single()

        if (clientError || !client) {
          setError('Client not found')
          router.push('/clients')
          return
        }

        setFormData(client)
      } catch (err) {
        console.error('[EditClient] Error:', err)
        setError('Failed to load client')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [clientId, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          company: formData.company || null,
          industry: formData.industry || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[EditClient] Update error:', updateError)
        setError('Failed to update client')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/clients/${clientId}`)
      }, 1500)
    } catch (err) {
      console.error('[EditClient] Error:', err)
      setError('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading client...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/clients/${clientId}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back to Client
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">Edit Client</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-lg text-sm mb-6">
            ✗ {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="glass border-green-500/50 bg-green-500/10 text-green-300 px-4 py-3 rounded-lg text-sm mb-6">
            ✓ Client updated successfully!
          </div>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Edit Client Information</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="+60 12-3456789"
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company || ''}
                  onChange={handleChange}
                  placeholder="Acme Corporation"
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry || ''}
                  onChange={handleChange}
                  placeholder="e.g., Technology, Design, etc."
                  className="glass px-4 py-3 rounded-lg text-white placeholder-gray-400 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-6">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? '💾 Saving...' : '✓ Save Changes'}
                </Button>
                <Link href={`/clients/${clientId}`} className="flex-1">
                  <button
                    type="button"
                    className="w-full glass px-4 py-2 rounded-lg text-gray-300 hover:text-gray-200 font-medium transition"
                  >
                    Cancel
                  </button>
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
