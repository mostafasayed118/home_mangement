import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// PBKDF2 configuration - 100,000 iterations (OWASP recommended minimum)
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

// Generate a random salt for PBKDF2
function generateSalt(): string {
  const array = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash password using PBKDF2 via Web Crypto API
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

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    return user;
  },
});

// Get user by ID
export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
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

    // Generate unique salt and hash password with PBKDF2
    const salt = generateSalt();
    const passwordHash = await hashPassword(args.password, salt);
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      passwordSalt: salt,
      name: args.name,
      emailVerified: false,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

// Verify user email
export const verifyEmail = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      emailVerified: true,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Update user password
export const updatePassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate a new salt for the new password
    const salt = generateSalt();
    const passwordHash = await hashPassword(args.newPassword, salt);

    await ctx.db.patch(args.userId, {
      passwordHash,
      passwordSalt: salt,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Validate password
export const validatePassword = query({
  args: {
    userId: v.id("users"),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.passwordSalt) {
      return false;
    }

    // Use PBKDF2 with stored salt for comparison
    const hashedPassword = await hashPassword(args.password, user.passwordSalt);
    return hashedPassword === user.passwordHash;
  },
});

// Get current user from session
export const getCurrentUser = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
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

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});
