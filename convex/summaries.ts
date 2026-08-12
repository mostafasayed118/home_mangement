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
 * Calculate month preview - sums payments and maintenance for a given month/year
 * This is a read-only preview that doesn't save anything
 */
export const calculateMonthPreview = query({
  args: {
    month: v.number(),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const { month, year } = args;

    // Get all payments with status === "paid" for this month/year
    const paidPayments = await ctx.db
      .query("payments")
      .withIndex("by_month_year", (q) =>
        q.eq("month", month).eq("year", year)
      )
      .collect();

    // Filter only paid and partial payments
    const paidAndPartial = paidPayments.filter((p) => p.status === "paid" || p.status === "partial");

    // Calculate total income from paid and partial payments
    const totalIncome = paidAndPartial.reduce((sum, p) => sum + p.amount, 0);

    // Get all maintenance records
    const allMaintenance = await ctx.db.query("maintenance").collect();

    // Calculate start and end timestamps for the month
    const startOfMonth = new Date(year, month - 1, 1).getTime();
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    // Filter maintenance records within the month
    const monthMaintenance = allMaintenance.filter((m) =>
      m.date >= startOfMonth && m.date <= endOfMonth
    );

    // Calculate total expenses from maintenance
    const totalExpenses = monthMaintenance.reduce((sum, m) => sum + m.cost, 0);

    // Calculate net profit
    const netProfit = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      paidPaymentsCount: paidAndPartial.length,
      maintenanceRecordsCount: monthMaintenance.length,
    };
  },
});

/**
 * Get all monthly summaries, sorted by year and month descending (newest first)
 */
export const getSummaries = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const summaries = await ctx.db.query("monthlySummaries").collect();

    // Sort by year descending, then month descending
    const sortedSummaries = summaries.sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      return b.month - a.month;
    });

    return sortedSummaries;
  },
});

/**
 * Save a summary (add or update)
 * If a summary for that month/year already exists, update it; otherwise, insert it
 */
export const saveSummary = mutation({
  args: {
    month: v.number(),
    year: v.number(),
    totalIncome: v.number(),
    totalExpenses: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can save summaries
    await requireAdmin(ctx);
    const { month, year, totalIncome, totalExpenses, notes } = args;
    const netProfit = totalIncome - totalExpenses;

    // Check if a summary for this month/year already exists
    const existingSummary = await ctx.db
      .query("monthlySummaries")
      .withIndex("by_month_year", (q) => q.eq("month", month).eq("year", year))
      .first();

    if (existingSummary) {
      // Update existing summary
      await ctx.db.patch(existingSummary._id, {
        totalIncome,
        totalExpenses,
        netProfit,
        notes,
        updatedAt: Date.now(),
      });
      return existingSummary._id;
    } else {
      // Insert new summary
      const now = Date.now();
      const summaryId = await ctx.db.insert("monthlySummaries", {
        month,
        year,
        totalIncome,
        totalExpenses,
        netProfit,
        notes,
        createdAt: now,
        updatedAt: now,
      });
      return summaryId;
    }
  },
});

/**
 * Delete a summary by ID
 */
export const deleteSummary = mutation({
  args: {
    id: v.id("monthlySummaries"),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can delete summaries
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

/**
 * Update a summary by ID - allows editing existing summary values
 */
export const updateSummary = mutation({
  args: {
    id: v.id("monthlySummaries"),
    totalIncome: v.number(),
    totalExpenses: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update summaries
    await requireAdmin(ctx);
    const { id, totalIncome, totalExpenses, notes } = args;
    const netProfit = totalIncome - totalExpenses;

    await ctx.db.patch(id, {
      totalIncome,
      totalExpenses,
      netProfit,
      notes,
      updatedAt: Date.now(),
    });

    return id;
  },
});
