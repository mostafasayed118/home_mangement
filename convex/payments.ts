import { query, mutation, internalMutation, type QueryCtx, type MutationCtx } from "./_generated/server";
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
 * Generate upload URL for receipt image upload
 * This is called from the client to get a signed URL to upload to Convex storage
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Generate a signed upload URL that expires in 5 minutes
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get receipt image URL from storage ID
 */
export const getReceiptUrl = mutation({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.storageId) {
      return null;
    }
    try {
      return await ctx.storage.getUrl(args.storageId);
    } catch (error) {
      console.error("Error getting receipt URL:", error);
      return null;
    }
  },
});

/**
 * Get all payments with optional pagination
 * Use cursor-based pagination to prevent memory issues with large datasets
 */
export const getAll = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const pageSize = Math.min(args.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const { page, continueCursor } = await ctx.db
      .query("payments")
      .paginate({ cursor: args.cursor ?? null, numItems: pageSize });

    // Enrich with tenant and apartment info
    const enrichedPayments = await Promise.all(
      page.map(async (payment) => {
        const tenant = await ctx.db.get(payment.tenantId);
        const apartment = await ctx.db.get(payment.apartmentId);
        return { ...payment, tenant, apartment };
      })
    );

    return {
      payments: enrichedPayments,
      nextCursor: continueCursor,
      hasMore: continueCursor !== null,
    };
  },
});

/**
 * Get payments for current month - ENRICHED with tenant and apartment info
 */
export const getCurrentMonth = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_month_year", (q) => q.eq("month", month).eq("year", year))
      .collect();

    // Enrich with tenant and apartment info (matching getByMonthYear behavior)
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const tenant = await ctx.db.get(payment.tenantId);
        const apartment = await ctx.db.get(payment.apartmentId);
        return { ...payment, tenant, apartment };
      })
    );

    return enrichedPayments;
  },
});

/**
 * Get payments by month and year
 */
export const getByMonthYear = query({
  args: {
    month: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_month_year", (q) =>
        q.eq("month", args.month).eq("year", args.year)
      )
      .collect();

    // Enrich with tenant and apartment info
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const tenant = await ctx.db.get(payment.tenantId);
        const apartment = await ctx.db.get(payment.apartmentId);
        return { ...payment, tenant, apartment };
      })
    );

    return enrichedPayments;
  },
});

/**
 * Get payments by status
 */
export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("late"),
      v.literal("partial")
    ),
  },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    return await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

/**
 * Get payments by apartment
 */
export const getByApartment = query({
  args: { apartmentId: v.id("apartments") },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", args.apartmentId))
      .collect();

    // Enrich with tenant info
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const tenant = await ctx.db.get(payment.tenantId);
        return { ...payment, tenant };
      })
    );

    return enrichedPayments;
  },
});

/**
 * Get payments by tenant
 */
export const getByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    return await ctx.db
      .query("payments")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

/**
 * Get pending payments
 */
export const getPending = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Enrich with tenant and apartment info
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const tenant = await ctx.db.get(payment.tenantId);
        const apartment = await ctx.db.get(payment.apartmentId);
        return { ...payment, tenant, apartment };
      })
    );

    return enrichedPayments;
  },
});

/**
 * Get building statistics - FIXED to filter out null apartments
 */
export const getBuildingStats = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get all apartments and filter out any that don't exist
    const apartments = await ctx.db.query("apartments").collect();

    // Get current month payments
    const currentPayments = await ctx.db
      .query("payments")
      .withIndex("by_month_year", (q) =>
        q.eq("month", currentMonth).eq("year", currentYear)
      )
      .collect();

    const paid = currentPayments.filter((p) => p.status === "paid");
    const pending = currentPayments.filter((p) => p.status === "pending");
    const late = currentPayments.filter((p) => p.status === "late");
    const partial = currentPayments.filter((p) => p.status === "partial");

    const collected = paid.reduce((sum, p) => sum + p.amount, 0) +
      partial.reduce((sum, p) => sum + p.amount, 0);

    const outstanding = pending.reduce((sum, p) => sum + p.amount, 0) +
      late.reduce((sum, p) => sum + p.amount, 0) +
      partial.reduce((sum, p) => {
        const apt = apartments.find(a => a._id === p.apartmentId);
        const rent = apt?.rentAmount ?? p.amount;
        if (!apt) {
          console.warn(`Apartment ${p.apartmentId} not found for payment ${p._id}. Using payment amount.`);
        }
        return sum + Math.max(0, rent - p.amount);
      }, 0);

    // Calculate total monthly rent only from existing apartments
    const totalMonthlyRent = apartments.reduce((sum, a) => sum + a.rentAmount, 0);

    // Count occupied apartments that actually exist
    const occupiedCount = apartments.filter((a) => a.status === "occupied").length;
    const occupancyRate = apartments.length > 0
      ? (occupiedCount / apartments.length) * 100
      : 0;

    return {
      totalMonthlyRent,
      collected,
      outstanding,
      occupancyRate,
      paidCount: paid.length,
      pendingCount: pending.length,
      lateCount: late.length,
      partialCount: partial.length,
      occupiedCount,
      totalUnits: apartments.length,
    };
  },
});

/**
 * Add a new payment
 */
export const addPayment = mutation({
  args: {
    tenantId: v.id("tenants"),
    apartmentId: v.id("apartments"),
    amount: v.number(),
    dueDate: v.number(),
    paymentDate: v.number(),
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("late"),
      v.literal("partial")
    ),
    notes: v.optional(v.string()),
    month: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can add payments
    await requireAdmin(ctx);

    // Business validation
    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    if (args.dueDate < 0 || args.paymentDate < 0) {
      throw new Error("Dates cannot be negative");
    }

    const validStatuses = ["paid", "pending", "late", "partial"];
    if (!validStatuses.includes(args.status)) {
      throw new Error(`Invalid status: ${args.status}`);
    }

    if (args.month < 1 || args.month > 12) {
      throw new Error("Month must be between 1 and 12");
    }

    if (args.year < 2000 || args.year > 2100) {
      throw new Error("Year is not realistic");
    }

    if (args.paymentDate !== 0 && args.dueDate < args.paymentDate) {
      throw new Error("Payment date cannot be before due date");
    }

    // Verify tenant exists
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Verify apartment exists
    const apartment = await ctx.db.get(args.apartmentId);
    if (!apartment) {
      throw new Error("Apartment not found");
    }

    // Check for existing payment (same tenant, month, year) - block both paid AND pending
    // Allow partial payments (can have multiple partials for same period)
    const existingPayment = await ctx.db
      .query("payments")
      .filter((q) =>
        q.and(
          q.eq(q.field("tenantId"), args.tenantId),
          q.eq(q.field("month"), args.month),
          q.eq(q.field("year"), args.year),
          q.or(
            q.eq(q.field("status"), "paid"),
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "late")
          )
        )
      )
      .first();

    if (existingPayment) {
      let statusLabel = "معلق";
      if (existingPayment.status === "paid") statusLabel = "مدفوع";
      if (existingPayment.status === "late") statusLabel = "متأخر";

      throw new Error(
        `A ${existingPayment.status} payment (${statusLabel}) already exists for this tenant in ${args.month}/${args.year}`
      );
    }

    const now = Date.now();
    const id = await ctx.db.insert("payments", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Update payment
 */
export const updatePayment = mutation({
  args: {
    id: v.id("payments"),
    amount: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    paymentDate: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("late"),
      v.literal("partial")
    )),
    notes: v.optional(v.string()),
    month: v.optional(v.number()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update payments
    await requireAdmin(ctx);

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a payment
 */
export const deletePayment = mutation({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    // Authorization check - only admins can delete payments
    await requireAdmin(ctx);

    await ctx.db.delete(args.id);
  },
});

/**
 * Update payment status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("payments"),
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("late"),
      v.literal("partial")
    ),
    paymentDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update payment status
    await requireAdmin(ctx);

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Record a full payment
 */
export const recordFullPayment = mutation({
  args: {
    paymentId: v.id("payments"),
    amount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can record payments
    await requireAdmin(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    await ctx.db.patch(args.paymentId, {
      status: "paid",
      amount: args.amount,
      paymentDate: Date.now(),
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Record a partial payment
 */
export const recordPartialPayment = mutation({
  args: {
    paymentId: v.id("payments"),
    amount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can record partial payments
    await requireAdmin(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    await ctx.db.patch(args.paymentId, {
      status: "partial",
      amount: args.amount,
      paymentDate: Date.now(),
      notes: args.notes,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Generate Monthly Payments - Can be triggered manually or via Convex dashboard
 * Creates pending payment records for all active tenants
 */
export const generateMonthlyPayments = internalMutation({
  handler: async (ctx) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const activeTenants = await ctx.db
      .query("tenants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const createdPayments = [];

    for (const tenant of activeTenants) {
      const apartment = await ctx.db.get(tenant.apartmentId);
      if (!apartment || apartment.status !== "occupied") continue;

      const existingPayment = await ctx.db
        .query("payments")
        .filter((q) =>
          q.and(
            q.eq(q.field("tenantId"), tenant._id),
            q.eq(q.field("month"), currentMonth),
            q.eq(q.field("year"), currentYear)
          )
        )
        .first();

      if (existingPayment) continue;

      const dueDate = new Date(currentYear, currentMonth - 1, 5).getTime();
      const paymentId = await ctx.db.insert("payments", {
        tenantId: tenant._id,
        apartmentId: tenant.apartmentId,
        amount: apartment.rentAmount,
        dueDate,
        paymentDate: 0,
        status: "pending",
        month: currentMonth,
        year: currentYear,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      });

      createdPayments.push(paymentId);
    }

    return { success: true, count: createdPayments.length };
  },
});

/**
 * Check and Mark Late Payments - Can be triggered manually or via Convex dashboard
 */
export const checkAndMarkLatePayments = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    const pendingPayments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const updated = [];
    for (const payment of pendingPayments) {
      if (payment.dueDate < now) {
        await ctx.db.patch(payment._id, { status: "late", updatedAt: now });
        updated.push(payment._id);
      }
    }

    return { success: true, count: updated.length };
  },
});
