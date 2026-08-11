import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Rate limiting configuration
// NOTE: In-memory rate limiting doesn't work well in serverless/edge environments.
// For production, implement Redis-based rate limiting using @upstash/ratelimit.
// We use both in-memory tracking AND delay as layered defense.
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_DELAY_MS = 500; // Additional delay in milliseconds

// In-memory rate limiter store (works for single-instance deployments)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const MAX_STORE_ENTRIES = 1000; // Prevent memory leak by limiting store size

/**
 * Clean up expired entries from the rate limiter store
 * Prevents memory leak by removing entries that have expired
 * Also enforces MAX_STORE_ENTRIES limit by removing oldest entries
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  let cleaned = 0;
  
  // First pass: remove expired entries
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  // Second pass: if still over limit, remove oldest expired entries
  if (rateLimitStore.size > MAX_STORE_ENTRIES) {
    const entries = Array.from(rateLimitStore.entries());
    // Sort by reset time (oldest first)
    entries.sort((a, b) => a[1].resetTime - b[1].resetTime);
    
    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, rateLimitStore.size - MAX_STORE_ENTRIES);
    for (const [key] of toRemove) {
      rateLimitStore.delete(key);
    }
  }
  
  if (cleaned > 0) {
    console.log(`[RateLimiter] Cleaned ${cleaned} expired entries. Store size: ${rateLimitStore.size}`);
  }
}

// Run cleanup every 5 minutes to prevent memory leak
// In serverless, this runs on each function instance
const CLEANUP_INTERVAL = 5 * 60 * 1000;
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, CLEANUP_INTERVAL);
}

/**
 * Check rate limit for an email - limits failed login attempts
 * @returns { allowed: boolean, remainingAttempts: number, resetTime: number }
 */
function checkRateLimit(email: string): { allowed: boolean; remainingAttempts: number; resetTime: number } {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // First attempt or window expired - allow it
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0, resetTime: record.resetTime };
  }
  
  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);
  
  return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS - record.count, resetTime: record.resetTime };
}

/**
 * Clear rate limit for an email (on successful login)
 */
function clearRateLimit(email: string): void {
  const key = email.toLowerCase();
  rateLimitStore.delete(key);
}

/**
 * Apply rate limiting - combines in-memory tracking with delay
 * Returns error response if rate limited, otherwise applies delay and continues
 */
async function applyRateLimit(email: string): Promise<{ allowed: boolean; response?: NextResponse }> {
  // First check in-memory rate limit
  const { allowed, remainingAttempts, resetTime } = checkRateLimit(email);
  
  if (!allowed) {
    const resetDate = new Date(resetTime);
    return {
      allowed: false,
      response: NextResponse.json(
        { valid: false, error: `Too many failed attempts. Try again after ${resetDate.toLocaleTimeString()}` },
        { status: 429 }
      )
    };
  }
  
  // Apply delay only when user has few remaining attempts (layered defense)
  // This slows down brute force attacks without impacting legitimate users
  if (remainingAttempts <= 2) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }
  
  return { allowed: true };
}

// PBKDF2 configuration - must match signin route
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;

// Hash password using PBKDF2 (matching Convex backend)
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8
  );
  
  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeCompare(a: string, b: string): boolean {
  const aBuffer = new TextEncoder().encode(a);
  const bBuffer = new TextEncoder().encode(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

// Compare password using PBKDF2 (matching Convex backend)
async function comparePassword(password: string, hash: string, salt: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password, salt);
  return timingSafeCompare(hashedPassword, hash);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ valid: false, error: "Missing credentials" }, { status: 400 });
    }

    // Apply rate limiting (email-based to limit failed attempts per user)
    // TODO: Replace with Redis-based rate limiting for production
    const rateLimitResult = await applyRateLimit(email);
    if (!rateLimitResult.allowed && rateLimitResult.response) {
      return rateLimitResult.response;
    }
    
    // Validate against the database using Convex
    const { ConvexHttpClient } = await import("convex/browser");
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const { api } = await import("../../../../convex/_generated/api");
    
    // Get user by email
    const user = await convex.query(api.auth.getUserForAuth, { email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ valid: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Validate password using PBKDF2 (matching Convex backend)
    // Handle both new users (with passwordSalt) and legacy users (without salt)
    let isValid = false;
    
    if (user.passwordSalt) {
      // New users with PBKDF2 salt
      isValid = await comparePassword(password, user.passwordHash, user.passwordSalt);
    } else {
      // Legacy users without salt - fallback to SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      isValid = timingSafeCompare(legacyHash, user.passwordHash);
    }
    
    if (!isValid) {
      return NextResponse.json({ valid: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Clear rate limit on successful validation
    clearRateLimit(email);

    return NextResponse.json({ valid: true, email: user.email });
  } catch (error) {
    console.error("Error validating credentials:", error);
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 });
  }
}
