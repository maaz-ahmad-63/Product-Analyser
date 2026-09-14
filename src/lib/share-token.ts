import crypto from 'crypto'
import { prisma } from './prisma'

/**
 * Public report token configuration.
 * All newly generated public report/share tokens must be exactly 32 URL-safe characters.
 */
export const PUBLIC_REPORT_TOKEN_LENGTH = 32

/**
 * Generates an unpredictable, non-sequential, cryptographically secure,
 * and URL-safe public report token of exactly 32 characters.
 *
 * Uses 16 cryptographically random bytes formatted as hexadecimal,
 * producing exactly 32 characters in [0-9a-f] (128 bits of entropy).
 *
 * Does not use database IDs, timestamps, usernames, analysis IDs, or predictable seeds.
 */
export function generateShareToken(): string {
  return crypto.randomBytes(PUBLIC_REPORT_TOKEN_LENGTH / 2).toString('hex')
}

/**
 * Generates a 32-character share token with collision validation against the database.
 */
export async function generateUniqueShareToken(): Promise<string> {
  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = generateShareToken()
    const existing = await prisma.comparisonAnalysis.findUnique({
      where: { shareToken: token },
      select: { id: true },
    })
    if (!existing) {
      return token
    }
  }
  return generateShareToken()
}

/**
 * Validates whether a given token matches valid public report token criteria.
 * Supports both new 32-character tokens and legacy 15-16 character tokens.
 */
export function isValidShareTokenFormat(token: unknown): token is string {
  if (typeof token !== 'string') return false
  if (token.length < 8 || token.length > 64) return false
  // Strictly URL-safe characters: alphanumeric, hyphen, underscore
  return /^[a-zA-Z0-9_-]+$/.test(token)
}
