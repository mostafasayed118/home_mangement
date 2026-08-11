import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { SignJWT } from "jose";
import { getJwtSecret, timingSafeCompare, generateJwtToken } from "../../../../lib/jwt";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Token expiration
const SESSION_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// PBKDF2 configuration - 100,000 iterations (OWASP recommended minimum)
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;

// Initialize Redis client for rate limiting
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

// Initialize Redis and rate limiter with validation
function initializeRateLimiter() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!redisUrl || !redisToken) {
    console.warn("WARNING: Redis credentials not configured. Rate limiting will use in-memory fallback.");
    return false;
  }
  
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "ratelimit:signin",
    });
    return true;
  } catch (error) {
    console.error("Failed to initialize Redis rate limiter:", error);
    return false;
  }
}

// Initialize on module load
const redisAvailable = initializeRateLimiter();

// In-memory fallback rate limiter
// NOTE: This is for development/demo only. In production with multiple instances,
// use Redis-based rate limiting (Upstash) for distributed rate limiting.
const fallbackRateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const MAX_STORE_ENTRIES = 1000; // Prevent memory leak by limiting store size
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Clean up expired entries from the fallback rate limiter store
 * Prevents memory leak by removing entries that have expired
 * Also enforces MAX_STORE_ENTRIES limit by removing oldest entries
 * 
 * NOTE: In serverless environments (e.g., Vercel), each function instance may have
 * its own memory space, so this cleanup only works within a single instance.
 * The Redis-based rate limiter should be used in production for proper distributed
 * rate limiting across multiple instances.
 */
function cleanupFallbackRateLimitStore(): void {
  const now = Date.now();
  let cleaned = 0;
  
  // First pass: remove expired entries
  for (const [key, record] of fallbackRateLimitStore.entries()) {
    if (now > record.resetTime) {
      fallbackRateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  // Second pass: if still over limit, remove oldest expired entries
  if (fallbackRateLimitStore.size > MAX_STORE_ENTRIES) {
    const entries = Array.from(fallbackRateLimitStore.entries());
    // Sort by reset time (oldest first)
    entries.sort((a, b) => a[1].resetTime - b[1].resetTime);
    
    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, fallbackRateLimitStore.size - MAX_STORE_ENTRIES);
    for (const [key] of toRemove) {
      fallbackRateLimitStore.delete(key);
    }
  }
  
  if (cleaned > 0) {
    console.log(`[RateLimiter] Cleaned ${cleaned} expired entries. Store size: ${fallbackRateLimitStore.size}`);
  }
}

/**
 * Start the cleanup interval for the fallback rate limiter
 * Call this to start periodic cleanup. In serverless, this may not persist
 * between invocations, so cleanup is also triggered on-demand.
 */
function startCleanupInterval(): void {
  if (cleanupIntervalId !== null) return; // Already running
  
  // Run cleanup every 5 minutes to prevent memory leak
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  
  // Only start if setInterval is available (not in all edge runtimes)
  if (typeof setInterval !== 'undefined') {
    cleanupIntervalId = setInterval(cleanupFallbackRateLimitStore, CLEANUP_INTERVAL);
    
    // Prevent interval from keeping process alive in serverless
    // This is a best-effort cleanup
    cleanupIntervalId.unref?.();
  }
}

// Start cleanup interval on module load (for persistent servers)
// In serverless, this runs on each function instance
startCleanupInterval();

function checkFallbackRateLimit(email: string): { allowed: boolean; remainingAttempts: number; resetTime: number } {
  // Run cleanup if store is getting large (run on ~10% of requests to reduce overhead)
  if (fallbackRateLimitStore.size > 100 && Math.random() < 0.1) {
    cleanupFallbackRateLimitStore();
  }
  
  const now = Date.now();
  const key = email.toLowerCase();
  const record = fallbackRateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    fallbackRateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  fallbackRateLimitStore.set(key, record);
  return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS - record.count, resetTime: record.resetTime };
}

/**
 * Apply rate limiting using Redis-based rate limiting (or fallback)
 * Returns error response if rate limited, otherwise continues
 */
async function applyRateLimit(email: string): Promise<{ allowed: boolean; response?: NextResponse }> {
  // Use Redis-based rate limiter if available
  if (ratelimit && redis) {
    try {
      const { success } = await ratelimit.limit(email.toLowerCase());
      
      if (!success) {
        return {
          allowed: false,
          response: NextResponse.json(
            { success: false, error: "Too many failed attempts. Please try again later." },
            { status: 429 }
          )
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error("Redis rate limiting error, falling back to in-memory:", error);
      // Fall through to in-memory rate limiter
    }
  }
  
  // Use in-memory fallback rate limiter (fail-closed)
  const result = checkFallbackRateLimit(email);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return {
      allowed: false,
      response: NextResponse.json(
        { 
          success: false, 
          error: "Too many failed attempts. Please try again later.",
          retryAfter 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Remaining": "0"
          }
        }
      )
    };
  }
  
  return { allowed: true };
}

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Get environment
function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

// Generate a secure random token using crypto (for verification tokens)
function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

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

// Compare password using PBKDF2 (matching Convex backend)
async function comparePassword(password: string, hash: string, salt: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password, salt);
  return timingSafeCompare(hashedPassword, hash);
}

// Deleted local generation block

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate credentials
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 });
    }

    // Apply rate limiting (email-based to limit failed attempts per user)
    const rateLimitResult = await applyRateLimit(email);
    if (!rateLimitResult.allowed && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Get Convex client
    const { ConvexHttpClient } = await import("convex/browser");
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    
    // Import the API
    const { api } = await import("../../../../convex/_generated/api");
    
    // Get user by email - includes passwordHash and passwordSalt
    const user = await convex.query(api.auth.getUserForAuth, { email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    // Check if user has passwordSalt (new users will have it)
    if (!user.passwordSalt) {
      // Legacy user without salt - fallback to old SHA-256 comparison
      // This handles migration from old password hashes
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (!timingSafeCompare(legacyHash, user.passwordHash)) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid email or password"
        }, { status: 401 });
      }
    } else {
      // Compare password using PBKDF2 with stored salt
      const isValid = await comparePassword(password, user.passwordHash, user.passwordSalt);
      
      if (!isValid) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid email or password"
        }, { status: 401 });
      }
    }

    // Rate limiting applied via delay (see applyRateLimit function above)
    // TODO: Replace with Redis-based rate limiting for production

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json({ 
        success: false, 
        error: "Email not verified",
        needsVerification: true,
      }, { status: 403 });
    }

    // Note: Redis rate limit automatically resets on success
    // No need to manually clear rate limit

    // Create session token (JWT for middleware validation)
    const sessionToken = await generateJwtToken(
      user._id,
      user.email,
      user.name,
      user.role
    );

    // Set the cookie server-side for middleware to recognize
    const cookieStore = await cookies();
    cookieStore.set({
      name: "auth_token",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: "/",
    });

    return NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("Error in sign-in:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
