import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// Default page size for pagination
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Authorization helper function
 * Checks if the current user is authenticated and has admin role
 * 
 * SECURITY: This function ONLY uses server-side authentication context.
 * It NEVER accepts client-supplied email or user data for authorization.
 */
async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<{ isAdmin: boolean; userId: string }> {
  // Always use server-side authentication - NEVER trust client-supplied data
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Unauthorized: Authentication required. Please log in.");
  }
  
  const userEmail = identity.email;
  
  if (!userEmail) {
    throw new Error("Unauthorized: User email not found. Please log in again.");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", userEmail))
    .first();
  
  if (!user) {
    throw new Error("Unauthorized: User not found. Please log in again.");
  }
  
  if (user.role !== "admin") {
    throw new Error("Forbidden: Admin privileges required to perform this action.");
  }
  
  return { isAdmin: true, userId: user._id };
}

/**
 * Get all apartments with optional pagination
 * Use cursor-based pagination to prevent memory issues with large datasets
 */
export const getAll = query({
  args: {
    searchTerm: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    
    const pageSize = Math.min(args.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    
    // Status translation map for Arabic search
    const statusTranslations: Record<string, string> = {
      "مؤجرة": "occupied",
      "مؤجره": "occupied",
      "شاغرة": "vacant",
      "شاغره": "vacant",
      "صيانة": "maintenance",
      "صيانه": "maintenance",
      "محجوزة": "reserved",
      "محجوزه": "reserved"
    };
    
    const searchTerm = args.searchTerm?.trim().toLowerCase();
    
    if (searchTerm) {
      // In-memory filtering for search
      const allApartments = await ctx.db.query("apartments").collect();
      
      // Map arabic search term to english status if matches translation
      const searchStatus = statusTranslations[searchTerm] || searchTerm;
      
      const filteredApartments = allApartments.filter(apt => {
        const matchesLabel = apt.unitLabel.toLowerCase().includes(searchTerm);
        const matchesFloor = apt.floor.toString().includes(searchTerm);
        // Match either English database status or Arabic translation
        const matchesStatus = apt.status.includes(searchStatus);
        
        return matchesLabel || matchesFloor || matchesStatus;
      });
      
      // Manual pagination
      let cursorNum = 0;
      if (args.cursor) {
        const parsed = parseInt(args.cursor, 10);
        if (isNaN(parsed) || parsed < 0) {
          return {
            apartments: [],
            nextCursor: null,
            hasMore: false,
          };
        }
        cursorNum = parsed;
      }
      
      const endIndex = cursorNum + pageSize;
      const paginatedApartments = filteredApartments.slice(cursorNum, endIndex);
      const hasMore = endIndex < filteredApartments.length;
      
      return {
        apartments: paginatedApartments,
        nextCursor: hasMore ? endIndex.toString() : null,
        hasMore,
      };
    }
    
    // Default database pagination when no search term
    const { page, continueCursor } = await ctx.db
      .query("apartments")
      .paginate({ cursor: args.cursor ?? null, numItems: pageSize });
    
    return {
      apartments: page,
      nextCursor: continueCursor,
      hasMore: continueCursor !== null,
    };
  },
});

/**
 * Get apartment by ID
 */
export const getById = query({
  args: { id: v.id("apartments") },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    return await ctx.db.get(args.id);
  },
});

/**
 * Get apartment by unit label (e.g., "1-A")
 */
export const getByLabel = query({
  args: { unitLabel: v.string() },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    return await ctx.db
      .query("apartments")
      .withIndex("by_unitLabel", (q) => q.eq("unitLabel", args.unitLabel))
      .first();
  },
});

/**
 * Get apartments by floor
 */
export const getByFloor = query({
  args: { floor: v.number() },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    return await ctx.db
      .query("apartments")
      .withIndex("by_floor", (q) => q.eq("floor", args.floor))
      .collect();
  },
});

/**
 * Get apartments by status
 */
export const getByStatus = query({
  args: { status: v.union(v.literal("occupied"), v.literal("vacant"), v.literal("maintenance"), v.literal("reserved")) },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    return await ctx.db
      .query("apartments")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

/**
 * Add a new apartment
 */
export const addApartment = mutation({
  args: {
    floor: v.number(),
    unitNumber: v.string(),
    unitLabel: v.string(),
    status: v.union(v.literal("occupied"), v.literal("vacant"), v.literal("maintenance"), v.literal("reserved")),
    rentAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can add apartments
    await requireAdmin(ctx);
    
    // Validate rent amount - cannot be negative
    if (args.rentAmount < 0) {
      throw new Error("Rent amount cannot be negative");
    }
    
    // Normalize unitLabel to uppercase for consistency and case-insensitive duplicate check
    const normalizedUnitLabel = args.unitLabel.trim().toUpperCase();
    
    // Check if apartment with same unitLabel already exists (case-insensitive)
    const existingApartment = await ctx.db
      .query("apartments")
      .withIndex("by_unitLabel", (q) => q.eq("unitLabel", normalizedUnitLabel))
      .first();

    if (existingApartment) {
      throw new Error(`An apartment with unit label "${args.unitLabel}" already exists`);
    }

    const now = Date.now();
    const id = await ctx.db.insert("apartments", {
      ...args,
      unitLabel: normalizedUnitLabel, // Store normalized format
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Update apartment status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("apartments"),
    status: v.union(v.literal("occupied"), v.literal("vacant"), v.literal("maintenance"), v.literal("reserved")),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update apartment status
    await requireAdmin(ctx);
    
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update apartment rent amount
 */
export const updateRent = mutation({
  args: {
    id: v.id("apartments"),
    rentAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update rent
    await requireAdmin(ctx);
    
    await ctx.db.patch(args.id, {
      rentAmount: args.rentAmount,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update apartment (full update)
 */
export const updateApartment = mutation({
  args: {
    id: v.id("apartments"),
    floor: v.optional(v.number()),
    unitNumber: v.optional(v.string()),
    unitLabel: v.optional(v.string()),
    status: v.optional(v.union(v.literal("occupied"), v.literal("vacant"), v.literal("maintenance"), v.literal("reserved"))),
    rentAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update apartments
    await requireAdmin(ctx);
    
    const { id, ...updates } = args;
    
    // Normalize and check unitLabel uniqueness if it's being updated
    if (updates.unitLabel !== undefined) {
      updates.unitLabel = updates.unitLabel.trim().toUpperCase();
      
      const existingApartment = await ctx.db
        .query("apartments")
        .withIndex("by_unitLabel", (q) => q.eq("unitLabel", updates.unitLabel as string))
        .first();

      if (existingApartment && existingApartment._id !== id) {
        throw new Error(`An apartment with unit label "${updates.unitLabel}" already exists`);
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete an apartment
 */
export const deleteApartment = mutation({
  args: { id: v.id("apartments") },
  handler: async (ctx, args) => {
    // Authorization check - only admins can delete apartments
    await requireAdmin(ctx);
    
    // Check if apartment has ANY associated tenant (active or inactive)
    const associatedTenant = await ctx.db
      .query("tenants")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", args.id))
      .first();
    
    // Check if apartment has ANY associated payments
    const associatedPayment = await ctx.db
      .query("payments")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", args.id))
      .first();
    
    if (associatedTenant || associatedPayment) {
      throw new Error("Cannot delete this apartment because it has associated tenants or payment records. Please set its status to 'maintenance' or 'vacant' instead to preserve financial history.");
    }
    
    await ctx.db.delete(args.id);
  },
});

/**
 * Get building statistics
 */
export const getStats = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const apartments = await ctx.db.query("apartments").collect();
    
    const total = apartments.length;
    const occupied = apartments.filter(a => a.status === "occupied").length;
    const vacant = apartments.filter(a => a.status === "vacant").length;
    const maintenance = apartments.filter(a => a.status === "maintenance").length;
    const reserved = apartments.filter(a => a.status === "reserved").length;
    
    const totalMonthlyRent = apartments.reduce((sum, a) => sum + a.rentAmount, 0);
    const occupiedRent = apartments
      .filter(a => a.status === "occupied")
      .reduce((sum, a) => sum + a.rentAmount, 0);
    
    return {
      total,
      occupied,
      vacant,
      maintenance,
      reserved,
      occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
      totalMonthlyRent,
      occupiedRent,
    };
  },
});

/**
 * Get dashboard statistics for the home page
 * Returns: totalApartments, occupiedApartments, vacantApartments, occupancyRate, totalMonthlyRent
 */
export const getDashboardStats = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const apartments = await ctx.db.query("apartments").collect();
    
    const totalApartments = apartments.length;
    const occupiedApartments = apartments.filter(a => a.status === "occupied").length;
    const vacantApartments = apartments.filter(a => a.status === "vacant").length;
    
    const occupancyRate = totalApartments > 0 
      ? (occupiedApartments / totalApartments) * 100 
      : 0;
    
    // Sum of rentAmount for all occupied apartments
    const totalMonthlyRent = apartments
      .filter(a => a.status === "occupied")
      .reduce((sum, a) => sum + a.rentAmount, 0);
    
    return {
      totalApartments,
      occupiedApartments,
      vacantApartments,
      occupancyRate: Math.round(occupancyRate * 10) / 10, // Round to 1 decimal place
      totalMonthlyRent,
    };
  },
});
