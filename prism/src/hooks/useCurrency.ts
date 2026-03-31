import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/countries'

const STORAGE_KEY = 'verkspay_currency'

export function useCurrency() {
  const [currencyCode, setCurrencyCode] = useState('MYR')
  const [loading, setLoading] = useState(true)

  const loadFromDB = useCallback(async () => {
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
        localStorage.setItem(STORAGE_KEY, data.currency_code)
      }
    } catch (err) {
      // Fallback to MYR on error
      setCurrencyCode('MYR')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Hydrate immediately from localStorage to avoid flash
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) setCurrencyCode(cached)

    // Then load from DB (source of truth)
    loadFromDB()

    // Listen for currency changes broadcast from Settings page
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setCurrencyCode(e.newValue)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [loadFromDB])

  return {
    currencyCode,
    loading,
    format: (amount: number) => formatCurrency(amount, currencyCode),
  }
}
