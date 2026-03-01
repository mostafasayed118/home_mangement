import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // Max 10 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { valid: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ valid: false, error: "Missing credentials" }, { status: 400 });
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

    // Validate password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ valid: false, error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({ valid: true, email: user.email });
  } catch (error) {
    console.error("Error validating credentials:", error);
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 });
  }
}
