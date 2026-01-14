/**
 * Simple in-memory rate limiter for API routes
 * For production with multiple instances, use Redis-based solution
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  limit: number;        // Max requests
  windowMs: number;     // Time window in milliseconds
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);

  return {
    success: entry.count <= config.limit,
    limit: config.limit,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  // Auth endpoints - strict limits
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },      // 5 per hour
  login: { limit: 10, windowMs: 15 * 60 * 1000 },     // 10 per 15 minutes
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour

  // Invitation endpoints
  invitation: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour

  // General API endpoints
  api: { limit: 100, windowMs: 60 * 1000 },           // 100 per minute

  // Webhook endpoints - higher limits
  webhook: { limit: 1000, windowMs: 60 * 1000 },      // 1000 per minute
} as const;
