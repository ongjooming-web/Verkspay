import { supabase } from './supabase'

export async function getUser() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return null
    }
    return data.user
  } catch (err) {
    console.error('Error getting user:', err)
    return null
  }
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data?.session) {
      return null
    }
    return data.session
  } catch (err) {
    console.error('Error getting session:', err)
    return null
  }
}
