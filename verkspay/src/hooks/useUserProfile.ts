import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  currency_code: string
  country_code: string
  full_name?: string
  business_name?: string
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('currency_code, country_code, full_name, business_name')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('[useUserProfile] Error fetching profile:', error)
          // Set defaults if fetch fails
          setProfile({
            currency_code: 'MYR',
            country_code: 'MY',
          })
        } else if (data) {
          setProfile(data)
        }
      } catch (err) {
        console.error('[useUserProfile] Unexpected error:', err)
        setProfile({
          currency_code: 'MYR',
          country_code: 'MY',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  return { profile, loading }
}
