import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

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
 * Get all maintenance records
 */
export const getAll = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const maintenance = await ctx.db.query("maintenance").collect();
    
    // Enrich with apartment info
    const enrichedMaintenance = await Promise.all(
      maintenance.map(async (record) => {
        const apartment = record.apartmentId 
          ? await ctx.db.get(record.apartmentId)
          : null;
        return { ...record, apartment };
      })
    );
    
    return enrichedMaintenance;
  },
});

/**
 * Get maintenance by status
 */
export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const maintenance = await ctx.db
      .query("maintenance")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
    
    // Enrich with apartment info
    const enrichedMaintenance = await Promise.all(
      maintenance.map(async (record) => {
        const apartment = record.apartmentId 
          ? await ctx.db.get(record.apartmentId)
          : null;
        return { ...record, apartment };
      })
    );
    
    return enrichedMaintenance;
  },
});

/**
 * Get maintenance by apartment
 */
export const getByApartment = query({
  args: { apartmentId: v.id("apartments") },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    return await ctx.db
      .query("maintenance")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", args.apartmentId))
      .collect();
  },
});

/**
 * Get maintenance statistics - FIXED: do not mutate original array
 */
export const getStats = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const maintenance = await ctx.db.query("maintenance").collect();
    
    const totalCost = maintenance.reduce((sum, m) => sum + m.cost, 0);
    const pendingCount = maintenance.filter((m) => m.status === "pending").length;
    const inProgressCount = maintenance.filter((m) => m.status === "in_progress").length;
    const doneCount = maintenance.filter((m) => m.status === "done").length;
    
    // Group by month
    const byMonth: Record<string, number> = {};
    for (const m of maintenance) {
      const date = new Date(m.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + m.cost;
    }
    
    // Get recent maintenance (last 5) - FIX: use spread operator to avoid mutation
    const recent = [...maintenance]
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
    
    return {
      totalCost,
      pendingCount,
      inProgressCount,
      doneCount,
      byMonth,
      recent,
    };
  },
});

/**
 * Add a new maintenance record
 */
export const addMaintenanceRecord = mutation({
  args: {
    apartmentId: v.optional(v.id("apartments")),
    title: v.string(),
    cost: v.number(),
    date: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("done")
    ),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can add maintenance records
    await requireAdmin(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("maintenance", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Update maintenance (includes status field)
 */
export const updateMaintenance = mutation({
  args: {
    id: v.id("maintenance"),
    apartmentId: v.optional(v.id("apartments")),
    title: v.optional(v.string()),
    cost: v.optional(v.number()),
    date: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("done")
    )),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update maintenance records
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a maintenance record
 */
export const deleteMaintenance = mutation({
  args: { id: v.id("maintenance") },
  handler: async (ctx, args) => {
    // Authorization check - only admins can delete maintenance records
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * Update maintenance status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("maintenance"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update maintenance status
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get total maintenance costs for current year
 */
export const getYearlyCosts = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const maintenance = await ctx.db.query("maintenance").collect();
    
    const yearlyMaintenance = maintenance.filter((m) => {
      const date = new Date(m.date);
      return date.getFullYear() === args.year;
    });
    
    const totalCost = yearlyMaintenance.reduce((sum, m) => sum + m.cost, 0);
    
    // Group by month
    const byMonth: number[] = Array(12).fill(0);
    for (const m of yearlyMaintenance) {
      const date = new Date(m.date);
      byMonth[date.getMonth()] += m.cost;
    }
    
    return {
      totalCost,
      byMonth,
    };
  },
});
