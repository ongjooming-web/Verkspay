/**
 * Shared auth helpers for API routes
 * Use these to maintain consistent auth patterns across endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAuth } from './supabase-server'

export interface AuthResult {
  user: any
  error: any
}

/**
 * Verify Bearer token from Authorization header
 * Returns user if valid, error if invalid
 */
export async function verifyAuth(req: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = req.headers.get('authorization')

    if (!authHeader) {
      return {
        user: null,
        error: {
          message: 'Missing authorization header',
          status: 401
        }
      }
    }

    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return {
        user: null,
        error: {
          message: 'Invalid authorization header format',
          status: 401
        }
      }
    }

    // Verify token using Supabase auth
    const supabaseAuth = getSupabaseAuth()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return {
        user: null,
        error: {
          message: authError?.message || 'Unauthorized',
          status: 401
        }
      }
    }

    return {
      user,
      error: null
    }
  } catch (err: any) {
    return {
      user: null,
      error: {
        message: err.message || 'Auth verification failed',
        status: 401
      }
    }
  }
}

/**
 * Require auth and return user or error response
 * Usage in route handlers:
 * const { user, error } = await requireAuth(req)
 * if (error) return NextResponse.json({ error: error.message }, { status: error.status })
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  return verifyAuth(req)
}
