#!/usr/bin/env npx ts-node

/**
 * Create Master Test Account for Prism
 * This script creates an Enterprise-tier test account with full feature access
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMasterTestAccount() {
  const email = 'ongjooming@gmail.com'
  const password = 'TestMaster@2026'
  
  console.log('🚀 Creating Master Test Account...')
  console.log(`📧 Email: ${email}`)
  console.log(`💎 Tier: Enterprise (Unrestricted)`)
  console.log('')

  try {
    // Step 1: Create auth user
    console.log('[1/3] Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('❌ Auth creation failed:', authError.message)
      if (authError.message.includes('already exists')) {
        console.log('ℹ️  User already exists. Proceeding to update profile...')
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        const existingUser = users?.find(u => u.email === email)
        if (!existingUser) {
          console.error('❌ Could not find existing user')
          process.exit(1)
        }
        authData.user = existingUser
      } else {
        throw authError
      }
    }

    const userId = authData.user.id
    console.log(`✅ Auth user created: ${userId}`)
    console.log('')

    // Step 2: Create profile with Enterprise tier
    console.log('[2/3] Creating profile with Enterprise tier...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: 'Master Test',
        business_name: 'Prism Test Account',
        subscription_tier: 'enterprise',
        subscription_status: 'active',
        trial_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError.message)
      throw profileError
    }

    console.log(`✅ Profile created with Enterprise tier`)
    console.log('')

    // Step 3: Verify
    console.log('[3/3] Verifying account...')
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
      throw verifyError
    }

    console.log(`✅ Account verified`)
    console.log('')

    // Success!
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ MASTER TEST ACCOUNT CREATED')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('📋 Account Details:')
    console.log(`   Email:             ${email}`)
    console.log(`   Password:          ${password}`)
    console.log(`   User ID:           ${userId}`)
    console.log(`   Subscription Tier: ${profile.subscription_tier}`)
    console.log(`   Status:            ${profile.subscription_status}`)
    console.log('')
    console.log('🔗 Login URL: https://app.prismops.xyz/login')
    console.log('')
    console.log('⚠️  Important:')
    console.log('   - All features are unlocked (Enterprise tier)')
    console.log('   - Use this account for comprehensive testing')
    console.log('   - No usage limits or restrictions apply')
    console.log('   - Consider resetting password after first login')
    console.log('')

  } catch (error: any) {
    console.error('❌ Error creating master test account:', error.message)
    process.exit(1)
  }
}

createMasterTestAccount()
