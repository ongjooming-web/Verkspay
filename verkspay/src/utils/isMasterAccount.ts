/**
 * Master Test Account Bypass
 * 
 * Checks if a user is a master test account that bypasses all plan restrictions.
 * Only works with server-side environment variables - never exposed to client.
 * 
 * Master accounts get:
 * - Unlimited invoices
 * - Unlimited payment links
 * - Unlimited AI insights
 * - No trial expiry
 * - All features enabled
 * 
 * Configuration: MASTER_TEST_EMAILS=email1@example.com,email2@example.com
 */

export function isMasterAccount(email: string | undefined | null): boolean {
  if (!email) return false

  const masterEmails = process.env.MASTER_TEST_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
  return masterEmails.includes(email.toLowerCase())
}

/**
 * Check if a user has a feature enabled, accounting for master account bypass
 */
export function hasFeatureAccess(
  email: string | undefined | null,
  requiredTier: 'trial' | 'starter' | 'pro' | 'enterprise',
  userTier?: string
): boolean {
  // Master accounts bypass all checks
  if (isMasterAccount(email)) {
    return true
  }

  // Map tiers to numeric levels
  const tierLevels: { [key: string]: number } = {
    'trial': 0,
    'starter': 1,
    'pro': 2,
    'enterprise': 3,
  }

  const userLevel = tierLevels[userTier || 'trial'] ?? 0
  const requiredLevel = tierLevels[requiredTier] ?? 0

  return userLevel >= requiredLevel
}

/**
 * Check usage limits, accounting for master account bypass
 */
export function checkUsageLimit(
  email: string | undefined | null,
  currentCount: number,
  limit: number
): boolean {
  // Master accounts have no limits
  if (isMasterAccount(email)) {
    return true
  }

  return currentCount < limit
}

/**
 * Check trial expiry, accounting for master account bypass
 */
export function isTrialExpired(
  email: string | undefined | null,
  trialExpiresAt: string | null | undefined
): boolean {
  // Master accounts never expire
  if (isMasterAccount(email)) {
    return false
  }

  if (!trialExpiresAt) return false

  return new Date(trialExpiresAt) < new Date()
}
