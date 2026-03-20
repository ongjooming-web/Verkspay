import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/countries'

export function useCurrency() {
  const [currencyCode, setCurrencyCode] = useState('MYR')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return setLoading(false)

        const { data } = await supabase
          .from('profiles')
          .select('currency_code')
          .eq('id', user.id)
          .single()

        if (data?.currency_code) {
          setCurrencyCode(data.currency_code)
        }
      } catch (err) {
        console.error('[useCurrency] Error loading currency:', err)
        // Fallback to MYR on error
        setCurrencyCode('MYR')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return {
    currencyCode,
    loading,
    format: (amount: number) => formatCurrency(amount, currencyCode),
  }
}
