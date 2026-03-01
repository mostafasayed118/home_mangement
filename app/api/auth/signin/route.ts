import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { SignJWT } from "jose";

// Token expiration
const SESSION_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// JWT secret from environment
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-in-production-minimum-32-chars"
);

// PBKDF2 configuration - 100,000 iterations (OWASP recommended minimum)
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

// In-memory rate limiter store
// Note: In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter function
 * Limits failed login attempts per email
 * @param email - The email to check
 * @returns { allowed: boolean, remainingAttempts: number, resetTime: number }
 */
function checkRateLimit(email: string): { allowed: boolean; remainingAttempts: number; resetTime: number } {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimitStore.get(key);
  
  if (!record) {
    // First attempt - allow it
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  // Check if window has expired
  if (now > record.resetTime) {
    // Reset the counter
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  // Check if limit exceeded
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    return { 
      allowed: false, 
      remainingAttempts: 0, 
      resetTime: record.resetTime 
    };
  }
  
  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);
  
  return { 
    allowed: true, 
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.count, 
    resetTime: record.resetTime 
  };
}

/**
 * Clear rate limit for an email (on successful login)
 */
function clearRateLimit(email: string): void {
  const key = email.toLowerCase();
  rateLimitStore.delete(key);
}

/**
 * Clean up expired rate limit entries periodically
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

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
  return hashedPassword === hash;
}

// Generate JWT token for sessions
async function generateJWTToken(userId: string, email: string, name?: string, role?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(SESSION_TOKEN_EXPIRY / 1000);
  
  return await new SignJWT({
    userId,
    email,
    name: name || "",
    role: role || "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(JWT_SECRET);
}

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

    // Check rate limit BEFORE any authentication attempt
    const rateLimitResult = checkRateLimit(email);
    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { 
          success: false, 
          error: "محاولات دخول كثيرة خاطئة. يرجى المحاولة لاحقاً",
          retryAfter: retryAfter
        },
        { 
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Remaining": "0"
          }
        }
      );
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
      
      if (legacyHash !== user.passwordHash) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid email or password",
          remainingAttempts: rateLimitResult.remainingAttempts 
        }, { status: 401 });
      }
    } else {
      // Compare password using PBKDF2 with stored salt
      const isValid = await comparePassword(password, user.passwordHash, user.passwordSalt);
      
      if (!isValid) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid email or password",
          remainingAttempts: rateLimitResult.remainingAttempts
        }, { status: 401 });
      }
    }

    // Clear rate limit on successful login
    clearRateLimit(email);

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json({ 
        success: false, 
        error: "Email not verified",
        needsVerification: true,
      }, { status: 403 });
    }

    // Create session token (JWT for middleware validation)
    const sessionToken = await generateJWTToken(
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
