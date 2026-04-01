'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        if (authUser?.id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()

          setProfile(profileData)
        }
      } catch (err) {
        console.error('Debug error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Debug Info</h1>

        <div className="space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-bold mb-2">User</h2>
                <pre className="text-sm overflow-auto bg-gray-900 p-2 rounded">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-bold mb-2">Profile</h2>
                {profile ? (
                  <>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>stripe_account_id:</strong>{' '}
                        <span className={profile?.stripe_account_id ? 'text-green-400' : 'text-red-400'}>
                          {profile?.stripe_account_id || 'NOT SET'}
                        </span>
                      </div>
                      <div>
                        <strong>stripe_onboarding_complete:</strong>{' '}
                        <span className={profile?.stripe_onboarding_complete ? 'text-green-400' : 'text-red-400'}>
                          {profile?.stripe_onboarding_complete ? 'true' : 'false'}
                        </span>
                      </div>
                      <div>
                        <strong>wallet_address:</strong>{' '}
                        <span className={profile?.wallet_address ? 'text-blue-400' : 'text-gray-400'}>
                          {profile?.wallet_address || 'NOT SET'}
                        </span>
                      </div>
                    </div>
                    <pre className="text-xs overflow-auto bg-gray-900 p-2 rounded mt-2">
                      {JSON.stringify(profile, null, 2)}
                    </pre>
                  </>
                ) : (
                  <p className="text-red-400">No profile found</p>
                )}
              </div>

              <div className="bg-blue-900 p-4 rounded-lg text-sm">
                <p>
                  <strong>Status:</strong>{' '}
                  {profile?.stripe_onboarding_complete && profile?.stripe_account_id ? (
                    <span className="text-green-300">✅ Stripe Connected</span>
                  ) : profile?.wallet_address ? (
                    <span className="text-blue-300">💰 Wallet Connected (fallback)</span>
                  ) : (
                    <span className="text-red-300">❌ No payment method</span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-400">
          <p>Go to <code className="bg-gray-800 px-2 py-1 rounded">/settings</code> to connect Stripe</p>
          <p>Then come back here to see if stripe_account_id and stripe_onboarding_complete are set</p>
        </div>
      </div>
    </div>
  )
}
