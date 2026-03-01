import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Token expiration times
const SESSION_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// PBKDF2 configuration - 100,000 iterations (OWASP recommended minimum)
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

// Generate a secure random token using Web Crypto API (V8 Edge Compatible)
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate a random salt for PBKDF2
function generateSalt(): string {
  const array = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash password using PBKDF2 via Web Crypto API (Edge-compatible)
// Uses SHA-256 as the pseudo-random function with 100,000 iterations
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);
  
  // Import the password as a key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8 // Convert to bits
  );
  
  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compare password with PBKDF2 hash
async function comparePassword(password: string, hash: string, salt: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password, salt);
  return hashedPassword === hash;
}

// Get session from token (Query - no Node.js needed)
export const getSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) {
      return null;
    }

    const authToken = await ctx.db
      .query("authTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!authToken || authToken.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(authToken.userId);
    if (!user) {
      return null;
    }

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      expiresAt: authToken.expiresAt,
    };
  },
});

// Get verification token info (Query - no Node.js needed)
export const getVerificationTokenInfo = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const verificationToken = await ctx.db
      .query("verificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verificationToken) {
      return null;
    }

    const user = await ctx.db.get(verificationToken.userId);
    if (!user) {
      return null;
    }

    return {
      email: user.email,
      type: verificationToken.type,
      expiresAt: verificationToken.expiresAt,
      isExpired: verificationToken.expiresAt < Date.now(),
    };
  },
});

// Validate reset token (Query - no Node.js needed)
export const validateResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const verificationToken = await ctx.db
      .query("verificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verificationToken || verificationToken.type !== "password_reset") {
      return { valid: false, error: "Invalid reset token" };
    }

    if (verificationToken.expiresAt < Date.now()) {
      return { valid: false, error: "Reset token has expired" };
    }

    return { valid: true };
  },
});

// Sign up - Create user and return verification token (Mutation with password hashing)
export const signUp = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    password: v.string(), // Plain password - hashed server-side
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Generate a unique salt for this user
    const salt = generateSalt();
    
    // Hash password server-side using PBKDF2 with the salt
    const passwordHash = await hashPassword(args.password, salt);

    // Create user
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      passwordSalt: salt, // Store the salt for future password verification
      name: args.name,
      emailVerified: false,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    // Create verification token
    const verificationToken = generateToken();
    await ctx.db.insert("verificationTokens", {
      userId,
      token: verificationToken,
      type: "email_verification",
      expiresAt: now + EMAIL_VERIFICATION_EXPIRY,
      createdAt: now,
    });

    return {
      userId,
      verificationToken,
      email: args.email.toLowerCase(),
    };
  },
});

// Sign in - Create session for authenticated user
// NOTE: Authentication is done in the API route before calling this mutation
export const signIn = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Generate new verification token
      const verificationToken = generateToken();
      const now = Date.now();

      // Delete any existing verification tokens for this user
      const existingTokens = await ctx.db
        .query("verificationTokens")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("type"), "email_verification"))
        .collect();

      for (const token of existingTokens) {
        await ctx.db.delete(token._id);
      }

      await ctx.db.insert("verificationTokens", {
        userId: user._id,
        token: verificationToken,
        type: "email_verification",
        expiresAt: now + EMAIL_VERIFICATION_EXPIRY,
        createdAt: now,
      });

      throw new Error("EMAIL_NOT_VERIFIED");
    }

    // Create session token
    const sessionToken = generateToken();
    const now = Date.now();

    await ctx.db.insert("authTokens", {
      userId: user._id,
      token: sessionToken,
      expiresAt: now + SESSION_TOKEN_EXPIRY,
      createdAt: now,
    });

    return {
      token: sessionToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  },
});

// Sign out - Invalidate session token
export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const authToken = await ctx.db
      .query("authTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (authToken) {
      await ctx.db.delete(authToken._id);
    }

    return true;
  },
});

// Verify email token
export const verifyEmailToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const verificationToken = await ctx.db
      .query("verificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verificationToken) {
      throw new Error("Invalid verification token");
    }

    if (verificationToken.type !== "email_verification") {
      throw new Error("Invalid token type");
    }

    if (verificationToken.expiresAt < Date.now()) {
      // Delete expired token
      await ctx.db.delete(verificationToken._id);
      throw new Error("Verification token has expired");
    }

    // Mark email as verified
    await ctx.db.patch(verificationToken.userId, {
      emailVerified: true,
      updatedAt: Date.now(),
    });

    // Delete the verification token
    await ctx.db.delete(verificationToken._id);

    // Create session token for auto-login
    const sessionToken = generateToken();
    const now = Date.now();

    await ctx.db.insert("authTokens", {
      userId: verificationToken.userId,
      token: sessionToken,
      expiresAt: now + SESSION_TOKEN_EXPIRY,
      createdAt: now,
    });

    const user = await ctx.db.get(verificationToken.userId);

    return {
      token: sessionToken,
      user: user ? {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      } : null,
    };
  },
});

// Request password reset
export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true, email: args.email.toLowerCase(), resetToken: null };
    }

    // Delete any existing password reset tokens for this user
    const existingTokens = await ctx.db
      .query("verificationTokens")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("type"), "password_reset"))
      .collect();

    for (const token of existingTokens) {
      await ctx.db.delete(token._id);
    }

    // Create new password reset token
    const resetToken = generateToken();
    const now = Date.now();

    await ctx.db.insert("verificationTokens", {
      userId: user._id,
      token: resetToken,
      type: "password_reset",
      expiresAt: now + PASSWORD_RESET_EXPIRY,
      createdAt: now,
    });

    return {
      success: true,
      email: user.email,
      resetToken,
    };
  },
});

// Reset password with token
export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(), // Plain password - hashed server-side
  },
  handler: async (ctx, args) => {
    const verificationToken = await ctx.db
      .query("verificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!verificationToken) {
      throw new Error("Invalid reset token");
    }

    if (verificationToken.type !== "password_reset") {
      throw new Error("Invalid token type");
    }

    if (verificationToken.expiresAt < Date.now()) {
      await ctx.db.delete(verificationToken._id);
      throw new Error("Reset token has expired");
    }

    // Generate a new salt for the new password (best practice)
    const salt = generateSalt();
    
    // Hash password server-side using PBKDF2 with the new salt
    const passwordHash = await hashPassword(args.newPassword, salt);

    // Update password with new hash and salt
    await ctx.db.patch(verificationToken.userId, {
      passwordHash,
      passwordSalt: salt,
      updatedAt: Date.now(),
    });

    // Delete the reset token
    await ctx.db.delete(verificationToken._id);

    // Invalidate all existing session tokens for this user
    const existingSessions = await ctx.db
      .query("authTokens")
      .withIndex("by_userId", (q) => q.eq("userId", verificationToken.userId))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Resend verification email
export const resendVerificationEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      // Return success to prevent email enumeration
      return { success: true };
    }

    if (user.emailVerified) {
      throw new Error("Email is already verified");
    }

    // Delete existing verification tokens
    const existingTokens = await ctx.db
      .query("verificationTokens")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("type"), "email_verification"))
      .collect();

    for (const token of existingTokens) {
      await ctx.db.delete(token._id);
    }

    // Create new verification token
    const verificationToken = generateToken();
    const now = Date.now();

    await ctx.db.insert("verificationTokens", {
      userId: user._id,
      token: verificationToken,
      type: "email_verification",
      expiresAt: now + EMAIL_VERIFICATION_EXPIRY,
      createdAt: now,
    });

    return {
      success: true,
      verificationToken,
      email: user.email,
    };
  },
});

// Create user directly with hashed password (for internal use)
export const createUserWithHash = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash: args.passwordHash,
      passwordSalt: args.passwordSalt,
      name: args.name,
      emailVerified: false,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

// Get user for password validation
export const getUserForAuth = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  },
});

// Store session token (for API route use)
export const storeSession = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("authTokens", {
      userId: args.userId,
      token: args.token,
      expiresAt: args.expiresAt,
      createdAt: now,
    });
    return { success: true };
  },
});

// Store verification token (for API route use)
export const storeVerificationToken = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    type: v.union(
      v.literal("email_verification"),
      v.literal("password_reset")
    ),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Delete existing tokens of the same type for this user
    const existingTokens = await ctx.db
      .query("verificationTokens")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .collect();

    for (const token of existingTokens) {
      await ctx.db.delete(token._id);
    }

    await ctx.db.insert("verificationTokens", {
      userId: args.userId,
      token: args.token,
      type: args.type,
      expiresAt: args.expiresAt,
      createdAt: now,
    });
    return { success: true };
  },
});
