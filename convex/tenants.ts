import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all tenants
 */
export const getAll = query({
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").collect();
    
    // Enrich with apartment info
    const enrichedTenants = await Promise.all(
      tenants.map(async (tenant) => {
        const apartment = await ctx.db.get(tenant.apartmentId);
        return { ...tenant, apartment };
      })
    );
    
    return enrichedTenants;
  },
});

/**
 * Get active tenants only
 */
export const getActive = query({
  handler: async (ctx) => {
    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    
    // Enrich with apartment info
    const enrichedTenants = await Promise.all(
      tenants.map(async (tenant) => {
        const apartment = await ctx.db.get(tenant.apartmentId);
        return { ...tenant, apartment };
      })
    );
    
    return enrichedTenants;
  },
});

/**
 * Get tenant by ID
 */
export const getById = query({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.id);
    if (tenant) {
      const apartment = await ctx.db.get(tenant.apartmentId);
      return { ...tenant, apartment };
    }
    return null;
  },
});

/**
 * Get tenant by apartment ID
 */
export const getByApartment = query({
  args: { apartmentId: v.id("apartments") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", args.apartmentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    
    if (tenant) {
      const apartment = await ctx.db.get(tenant.apartmentId);
      return { ...tenant, apartment };
    }
    return null;
  },
});

/**
 * Get tenants with expiring leases (within specified days)
 */
export const getExpiringLeases = query({
  args: { daysAhead: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const futureDate = now + args.daysAhead * 24 * 60 * 60 * 1000;
    
    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    
    // Filter for expiring leases
    const expiringTenants = tenants.filter(
      (t) => t.leaseEndDate > now && t.leaseEndDate <= futureDate
    );
    
    // Enrich with apartment info
    const enrichedTenants = await Promise.all(
      expiringTenants.map(async (tenant) => {
        const apartment = await ctx.db.get(tenant.apartmentId);
        return { ...tenant, apartment };
      })
    );
    
    return enrichedTenants;
  },
});

/**
 * Add a new tenant
 */
export const addTenant = mutation({
  args: {
    apartmentId: v.id("apartments"),
    name: v.string(),
    phone: v.string(),
    nationalId: v.string(),
    depositAmount: v.number(),
    leaseStartDate: v.number(),
    leaseEndDate: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Create the tenant
    const tenantId = await ctx.db.insert("tenants", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    
    // Update apartment status to occupied
    await ctx.db.patch(args.apartmentId, {
      status: "occupied",
      updatedAt: now,
    });
    
    return tenantId;
  },
});

/**
 * Update tenant information
 */
export const updateTenant = mutation({
  args: {
    id: v.id("tenants"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    nationalId: v.optional(v.string()),
    depositAmount: v.optional(v.number()),
    leaseStartDate: v.optional(v.number()),
    leaseEndDate: v.optional(v.number()),
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
 * Delete a tenant
 */
export const deleteTenant = mutation({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    // Check if there are active payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "late"),
          q.eq(q.field("status"), "partial")
        )
      )
      .collect();
    
    if (payments.length > 0) {
      throw new Error("Cannot delete tenant with outstanding payments");
    }
    
    // Delete tenant
    await ctx.db.delete(args.id);
    
    // Update apartment to vacant
    await ctx.db.patch(tenant.apartmentId, {
      status: "vacant",
      updatedAt: Date.now(),
    });
  },
});

/**
 * End tenant lease (mark as inactive)
 */
export const endLease = mutation({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const now = Date.now();
    
    // Check if tenant is already inactive - if so, don't change apartment status
    if (!tenant.isActive) {
      // Tenant is already inactive, just return without changing anything
      return;
    }
    
    // Mark tenant as inactive
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: now,
    });
    
    // Update apartment status to vacant (only if tenant was active)
    await ctx.db.patch(tenant.apartmentId, {
      status: "vacant",
      updatedAt: now,
    });
  },
});
