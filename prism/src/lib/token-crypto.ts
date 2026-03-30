/**
 * Token hashing utilities for secure magic link tokens
 * Never store raw tokens in database
 */

import crypto from 'crypto'

/**
 * Hash a token using SHA-256
 * Used for storing in database
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

/**
 * Generate a secure random token
 * Returns raw token (to send to client)
 */
export function generateToken(): string {
  return crypto.randomUUID()
}

/**
 * Verify token against stored hash
 * Returns true if token matches hash
 */
export function verifyTokenHash(token: string, tokenHash: string): boolean {
  const computedHash = hashToken(token)
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(tokenHash)
  )
}
