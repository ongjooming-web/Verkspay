import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Create a Master Test Account (Enterprise tier, unrestricted)
 * POST /api/admin/create-test-account
 * 
 * Required header: Authorization: Bearer YOUR_SECRET_KEY
 * (Set ADMIN_SECRET_KEY in environment to enable)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin secret
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.ADMIN_SECRET_KEY

    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'Admin endpoint not configured' },
        { status: 503 }
      )
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const providedSecret = authHeader.substring(7)
    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid authorization' },
        { status: 403 }
      )
    }

    const email = 'ongjooming@gmail.com'
    const password = 'TestMaster@2026'

    console.log('[Admin] Creating master test account:', email)

    // Step 1: Create auth user
    console.log('[Admin] Step 1: Creating auth user...')
    let userId: string

    // Try to create user first
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createError && !createError.message.includes('already exists')) {
      console.error('[Admin] Auth creation failed:', createError.message)
      return NextResponse.json(
        { error: `Auth creation failed: ${createError.message}` },
        { status: 400 }
      )
    }

    if (createData?.user) {
      userId = createData.user.id
      console.log('[Admin] Auth user created:', userId)
    } else {
      // User already exists, find it
      console.log('[Admin] User already exists, fetching...')
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError || !users) {
        console.error('[Admin] Failed to list users:', listError?.message)
        return NextResponse.json(
          { error: 'Could not find or create user' },
          { status: 500 }
        )
      }

      const existingUser = users.find(u => u.email === email)
      if (!existingUser) {
        console.error('[Admin] User not found after creation attempt')
        return NextResponse.json(
          { error: 'User creation failed and user not found' },
          { status: 500 }
        )
      }

      userId = existingUser.id
      console.log('[Admin] Found existing user:', userId)
    }

    // Step 2: Create/update profile
    console.log('[Admin] Step 2: Creating profile with Enterprise tier...')
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
      console.error('[Admin] Profile creation failed:', profileError.message)
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 400 }
      )
    }

    console.log('[Admin] Profile created/updated')

    // Step 3: Verify
    console.log('[Admin] Step 3: Verifying account...')
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (verifyError) {
      console.error('[Admin] Verification failed:', verifyError.message)
      return NextResponse.json(
        { error: `Verification failed: ${verifyError.message}` },
        { status: 400 }
      )
    }

    console.log('[Admin] Account verified successfully')

    // Success!
    return NextResponse.json({
      success: true,
      message: 'Master test account created successfully',
      account: {
        email,
        password,
        userId,
        subscriptionTier: profile.subscription_tier,
        subscriptionStatus: profile.subscription_status,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Admin] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create test account' },
      { status: 500 }
    )
  }
}
