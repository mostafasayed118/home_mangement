import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all tenants with optional search filter, status filter, and pagination
 * Optimized for performance with:
 * - Efficient search using combined query approach
 * - Database-level filtering (no in-memory filtering)
 * - Batch apartment fetching to avoid N+1 queries
 * - Pagination support for large datasets
 */
export const getAll = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending")
    )),
    // Pagination args
    cursor: v.optional(v.string()),
    numResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const NUM_RESULTS = args.numResults ?? 50; // Default 50, can be overridden
    const searchTerm = args.search?.trim();
    
    let tenants: any[] = [];
    let continueCursor: string | null = null;
    let hasMore = false;
    
    // If search term is provided, use search indexes
    // Note: Convex search indexes don't support cursor pagination, so we fetch a limited batch
    // and implement pagination in-memory. For very large datasets, consider using exact filters instead.
    if (searchTerm && searchTerm !== "") {
      // Fetch a larger batch to account for duplicates across indexes
      // This is a trade-off: fetch enough for pagination but not too many to impact performance
      const SEARCH_BATCH_SIZE = NUM_RESULTS * 3;
      
      // Get results from name search index (limited)
      const nameResults = await ctx.db
        .query("tenants")
        .withSearchIndex("search_by_name", (q) => q.search("name", searchTerm))
        .take(SEARCH_BATCH_SIZE);
      
      // Get results from phone search index (limited)
      const phoneResults = await ctx.db
        .query("tenants")
        .withSearchIndex("search_by_phone", (q) => q.search("phone", searchTerm))
        .take(SEARCH_BATCH_SIZE);
      
      // Get results from nationalId search index (limited)
      const nationalIdResults = await ctx.db
        .query("tenants")
        .withSearchIndex("search_by_nationalId", (q) => q.search("nationalId", searchTerm))
        .take(SEARCH_BATCH_SIZE);
      
      // Merge and deduplicate results using a Map
      const tenantMap = new Map();
      [...nameResults, ...phoneResults, ...nationalIdResults].forEach((tenant) => {
        if (!tenantMap.has(tenant._id)) {
          tenantMap.set(tenant._id, tenant);
        }
      });
      
      tenants = Array.from(tenantMap.values());
      
      // Apply status filter in-memory if provided (more efficient than two separate searches)
      if (args.status) {
        tenants = tenants.filter((tenant) => {
          const tenantStatus = tenant.status || (tenant.isActive ? "active" : "inactive");
          return tenantStatus === args.status;
        });
      }
      
      // Sort by name
      tenants.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      
      // Apply pagination manually since we're combining results
      // Validate cursor - return empty results for invalid cursors instead of silent fallback
      let cursorNum = 0;
      if (args.cursor) {
        const parsed = parseInt(args.cursor, 10);
        if (isNaN(parsed) || parsed < 0) {
          // Invalid cursor - return empty results
          return {
            tenants: [],
            continueCursor: null,
            hasMore: false,
          };
        }
        cursorNum = parsed;
      }
      const endIndex = cursorNum + NUM_RESULTS;
      const paginatedTenants = tenants.slice(cursorNum, endIndex);
      
      hasMore = endIndex < tenants.length;
      continueCursor = hasMore ? endIndex.toString() : null;
      tenants = paginatedTenants;
      
    } else {
      // No search term - use regular query with status filter at DB level
      let query = ctx.db.query("tenants");
      
      // Apply status filter at database level
      if (args.status) {
        query = query.filter((q) => q.eq(q.field("status"), args.status));
      }
      
      // Apply pagination directly at DB level
      const paginatedResults = await query.paginate({ 
        cursor: args.cursor || null, 
        numItems: NUM_RESULTS 
      });
      
      tenants = paginatedResults.page;
      continueCursor = paginatedResults.continueCursor;
      hasMore = paginatedResults.continueCursor !== null;
      
      // Sort by name
      tenants.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    
    // If no results, return early
    if (tenants.length === 0) {
      return {
        tenants: [],
        continueCursor: null,
        hasMore: false,
      };
    }
    
    // Batch fetch all unique apartments to avoid N+1 queries
    const apartmentIds = [...new Set(tenants.map(t => t.apartmentId))];
    const apartmentsMap = new Map();
    
    // Fetch all apartments in parallel
    const apartmentResults = await Promise.all(
      apartmentIds.map(id => ctx.db.get(id))
    );
    
    // Build the apartment lookup map
    apartmentIds.forEach((id, index) => {
      apartmentsMap.set(id, apartmentResults[index]);
    });
    
    // Enrich tenants with apartment data using the pre-fetched map
    const enrichedTenants = tenants.map(tenant => ({
      ...tenant,
      apartment: apartmentsMap.get(tenant.apartmentId) || null,
    }));
    
    return {
      tenants: enrichedTenants,
      continueCursor,
      hasMore,
    };
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
    email: v.optional(v.string()),
    phone: v.string(),
    nationalId: v.string(),
    depositAmount: v.number(),
    leaseStartDate: v.number(),
    leaseEndDate: v.number(),
    contractFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Verify the apartment exists
    const apartment = await ctx.db.get(args.apartmentId);
    if (!apartment) {
      throw new Error("Apartment not found");
    }
    
    // Check if a tenant with the same nationalId already exists
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_nationalId", (q) => q.eq("nationalId", args.nationalId))
      .first();

    if (existingTenant) {
      throw new Error("A tenant with this national ID already exists");
    }

    const now = Date.now();
    
    // Create the tenant
    const tenantId = await ctx.db.insert("tenants", {
      ...args,
      isActive: true,
      status: "active",
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
    contractFileId: v.optional(v.id("_storage")),
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
    
    // Check for other active tenants BEFORE deleting (to know if apartment should become vacant)
    const otherActiveTenants = await ctx.db
      .query("tenants")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", tenant.apartmentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.neq(q.field("_id"), args.id))
      .first();
    
    const shouldMarkVacant = !otherActiveTenants;
    
    // Delete tenant
    await ctx.db.delete(args.id);
    
    // Only update apartment to vacant if no other active tenants existed
    if (shouldMarkVacant) {
      await ctx.db.patch(tenant.apartmentId, {
        status: "vacant",
        updatedAt: Date.now(),
      });
    }
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
      status: "inactive",
      updatedAt: now,
    });
    
    // Check for other active tenants before marking apartment as vacant
    // (only mark vacant if no other active tenants exist on the same apartment)
    const otherActiveTenants = await ctx.db
      .query("tenants")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", tenant.apartmentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.neq(q.field("_id"), args.id))
      .first();
    
    // Only update apartment status to vacant if no other active tenants exist
    if (!otherActiveTenants) {
      await ctx.db.patch(tenant.apartmentId, {
        status: "vacant",
        updatedAt: now,
      });
    }
  },
});

/**
 * Update tenant status
 * Handles apartment status changes based on tenant status:
 * - active: apartment becomes "occupied"
 * - inactive: apartment becomes "vacant" (only if no other active tenants)
 * - pending: apartment becomes "reserved" (tenant moving in soon)
 * 
 * Concurrency handling: Re-checks state before each critical operation to handle race conditions.
 */
export const updateStatus = mutation({
  args: {
    id: v.id("tenants"),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    // Get fresh tenant data (in case it was updated since the request started)
    const tenant = await ctx.db.get(args.id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const now = Date.now();
    const previousStatus = tenant.status || (tenant.isActive ? "active" : "inactive");
    const newStatus = args.status;
    const newIsActive = newStatus === "active";
    
    // Skip if status hasn't changed
    if (previousStatus === newStatus) {
      return; // Return early without value
    }
    
    // Helper function to check for other active tenants on the same apartment
    // Always gets fresh data to handle race conditions
    const getOtherActiveTenant = async () => {
      return await ctx.db
        .query("tenants")
        .withIndex("by_apartmentId", (q) => q.eq("apartmentId", tenant.apartmentId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .filter((q) => q.neq(q.field("_id"), args.id))
        .first();
    };
    
    // Handle apartment status changes BEFORE updating tenant
    // This ensures consistency - if apartment update fails, tenant remains unchanged
    if (newStatus === "active") {
      // Re-check: another active tenant might have been added while we were processing
      const otherActiveTenant = await getOtherActiveTenant();
      
      if (otherActiveTenant) {
        throw new Error("Apartment is already occupied by another tenant");
      }
      
      // Update apartment to occupied
      await ctx.db.patch(tenant.apartmentId, {
        status: "occupied",
        updatedAt: now,
      });
    } else if (newStatus === "inactive") {
      // Re-check: another tenant might have become active while we were processing
      const otherActiveTenant = await getOtherActiveTenant();
      
      // Only update apartment to vacant if no other active tenants exist
      if (!otherActiveTenant) {
        await ctx.db.patch(tenant.apartmentId, {
          status: "vacant",
          updatedAt: now,
        });
      }
    } else if (newStatus === "pending") {
      // Re-check: another tenant might have become active while we were processing
      const otherActiveTenant = await getOtherActiveTenant();
      
      if (otherActiveTenant) {
        throw new Error("Cannot set to pending - apartment has an active tenant");
      }
      
      // Update apartment to reserved
      await ctx.db.patch(tenant.apartmentId, {
        status: "reserved",
        updatedAt: now,
      });
    }
    
    // Now update tenant status (after apartment is successfully updated)
    await ctx.db.patch(args.id, {
      status: newStatus,
      isActive: newIsActive,
      updatedAt: now,
    });
    
    // Removed: return newStatus; - Convex mutations don't need to return values
  },
});

/**
 * Generate an upload URL for tenant contract files
 */
export const generateContractUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Update tenant contract file
 */
export const updateTenantContract = mutation({
  args: {
    tenantId: v.id("tenants"),
    contractFileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tenantId, {
      contractFileId: args.contractFileId,
      updatedAt: Date.now(),
    });
  },
});
