'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SUPPORTED_COUNTRIES, getCountryConfig, isCountryAllowed } from '@/lib/countries'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'

interface Country {
  code: string
  name: string
  currency: string
  symbol: string
}

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  // Check auth and redirect if already onboarded
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Check if user already completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single()

      if (profile?.country_code && profile.country_code !== 'MY') {
        // Already onboarded, redirect to dashboard
        router.push('/dashboard')
        return
      }

      // Set default country to Malaysia
      setSelectedCountry(getCountryConfig('MY') as Country)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const filteredCountries = SUPPORTED_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectCountry = (country: Country) => {
    if (isCountryAllowed(country.code)) {
      setSelectedCountry(country)
      setSearchQuery('')
      setError('')
    } else {
      setError(`Service not available in ${country.name}`)
    }
  }

  const handleContinue = async () => {
    if (!selectedCountry) {
      setError('Please select a country')
      return
    }

    setSaving(true)
    setError('')

    try {
      const countryConfig = getCountryConfig(selectedCountry.code)
      if (!countryConfig) {
        setError('Invalid country selected')
        setSaving(false)
        return
      }

      // Update profile with country and currency
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          country_code: selectedCountry.code,
          currency_code: selectedCountry.currency,
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        setError('Failed to save country preference. Please try again.')
        setSaving(false)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Error during onboarding:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass px-8 py-12 rounded-lg text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-2xl relative z-10 backdrop-blur-xl border border-white/20">
        <CardHeader>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Welcome to Prism
          </h1>
          <p className="text-gray-400 text-sm mt-2">Step 1: Select your country</p>
        </CardHeader>

        <CardBody className="space-y-6">
          {error && (
            <div className="glass border-red-500/50 bg-red-500/10 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Country Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Your Country
            </label>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search countries..."
              className="w-full glass px-4 py-3 rounded-lg text-white placeholder-gray-400 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />

            {/* Selected Country Display */}
            {selectedCountry && !searchQuery && (
              <div className="glass rounded-lg p-4 border-blue-500/30 bg-blue-500/10 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{selectedCountry.name}</p>
                    <p className="text-gray-400 text-sm">
                      Currency: {selectedCountry.symbol} {selectedCountry.currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">Your invoices will be in</p>
                    <p className="text-2xl font-bold text-blue-400">{selectedCountry.symbol}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Country List */}
            {(searchQuery || !selectedCountry) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => handleSelectCountry(country)}
                      className={`glass px-4 py-3 rounded-lg text-left transition ${
                        selectedCountry?.code === country.code
                          ? 'border-blue-500/50 bg-blue-500/20 text-white'
                          : 'border-white/10 hover:border-white/20 text-gray-300 hover:text-white'
                      }`}
                      disabled={!isCountryAllowed(country.code)}
                    >
                      <div className="font-medium">{country.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {country.symbol} {country.currency}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4 text-gray-400">
                    No countries found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedCountry && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-gray-400 text-sm mb-3">
                💡 <strong>Preview:</strong> Your invoices will display amounts in <strong>{selectedCountry.symbol}</strong> ({selectedCountry.currency})
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                Skip for now
              </Button>
            </Link>
            <Button
              onClick={handleContinue}
              disabled={!selectedCountry || saving}
              className={`flex-1 font-semibold py-3 rounded-lg transition ${
                saving || !selectedCountry
                  ? 'bg-blue-600/50 text-blue-200/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
              }`}
            >
              {saving ? '⏳ Saving...' : '✓ Continue'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
