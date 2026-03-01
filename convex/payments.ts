import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all payments
 */
export const getAll = query({
  handler: async (ctx) => {
    const payments = await ctx.db.query("payments").collect();
    
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
 * Get payments for current month - ENRICHED with tenant and apartment info
 */
export const getCurrentMonth = query({
  handler: async (ctx) => {
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
    
    const collected = paid.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = pending.reduce((sum, p) => sum + p.amount, 0) +
                       late.reduce((sum, p) => sum + p.amount, 0) +
                       partial.reduce((sum, p) => sum + p.amount, 0);
    
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
            q.eq(q.field("status"), "pending")
          )
        )
      )
      .first();

    if (existingPayment) {
      const statusLabel = existingPayment.status === "paid" ? "مدفوع" : "معلق";
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
