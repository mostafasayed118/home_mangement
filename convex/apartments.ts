import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all apartments
 */
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("apartments").collect();
  },
});

/**
 * Get apartment by ID
 */
export const getById = query({
  args: { id: v.id("apartments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get apartment by unit label (e.g., "1-A")
 */
export const getByLabel = query({
  args: { unitLabel: v.string() },
  handler: async (ctx, args) => {
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
    const { id, ...updates } = args;
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
    // Check if apartment has active tenant
    const activeTenant = await ctx.db
      .query("tenants")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", args.id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    
    if (activeTenant) {
      throw new Error("Cannot delete apartment with active tenant");
    }
    
    await ctx.db.delete(args.id);
  },
});

/**
 * Get building statistics
 */
export const getStats = query({
  handler: async (ctx) => {
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
