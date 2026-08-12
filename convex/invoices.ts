import { query, mutation, internalMutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

/**
 * Type for enriched invoice with apartment and receipt URL
 */
type EnrichedInvoice = Doc<"invoices"> & {
  apartment: Doc<"apartments"> | null;
  receiptImageUrl: string | null;
};

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
 * Helper function to enrich a single invoice with apartment info and receipt URL
 */
async function enrichInvoice(
  ctx: QueryCtx | MutationCtx,
  invoice: Doc<"invoices">
): Promise<EnrichedInvoice> {
  const apartment = await ctx.db.get(invoice.apartmentId);
  
  let receiptImageUrl = null;
  if (invoice.receiptImageId) {
    receiptImageUrl = await ctx.storage.getUrl(invoice.receiptImageId);
  }
  
  return {
    ...invoice,
    apartment,
    receiptImageUrl,
  };
}

/**
 * Helper function to enrich multiple invoices with apartment info and receipt URLs
 */
async function enrichInvoices(
  ctx: QueryCtx | MutationCtx,
  invoices: Doc<"invoices">[]
): Promise<EnrichedInvoice[]> {
  return Promise.all(
    invoices.map((invoice) => enrichInvoice(ctx, invoice))
  );
}

/**
 * Helper function to sort invoices by date descending
 */
function sortByDateDesc(invoices: EnrichedInvoice[]): EnrichedInvoice[] {
  return invoices.sort((a, b) => b.date - a.date);
}

/**
 * Generate a secure upload URL for file uploads
 * This is required for uploading files to Convex storage
 */
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // Authorization check - only admins can upload files
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get all invoices with apartment info and image URLs
 * NOTE: Limited to 100 most recent invoices to prevent memory issues
 * For pagination, use getByStatus or getByApartment queries
 */
export const getAll = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    // Take 100 most recent invoices, then sort by dueDate in memory
    const invoices = await ctx.db.query("invoices")
      .take(100);
    const enrichedInvoices = await enrichInvoices(ctx, invoices);
    return sortByDateDesc(enrichedInvoices);
  },
});

/**
 * Get invoice by ID with apartment info and image URL
 */
export const getById = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const invoice = await ctx.db.get(args.id);
    if (!invoice) return null;
    return enrichInvoice(ctx, invoice);
  },
});

/**
 * Get invoices by apartment ID
 */
export const getByApartment = query({
  args: { apartmentId: v.id("apartments") },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_apartmentId", (q) => q.eq("apartmentId", args.apartmentId))
      .collect();
    
    const enrichedInvoices = await enrichInvoices(ctx, invoices);
    return sortByDateDesc(enrichedInvoices);
  },
});

/**
 * Get invoices by status
 */
export const getByStatus = query({
  args: { status: v.union(v.literal("paid"), v.literal("pending")) },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
    
    const enrichedInvoices = await enrichInvoices(ctx, invoices);
    return sortByDateDesc(enrichedInvoices);
  },
});

/**
 * Get invoices by type
 */
export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
    
    const enrichedInvoices = await enrichInvoices(ctx, invoices);
    return sortByDateDesc(enrichedInvoices);
  },
});

/**
 * Create a new invoice
 */
export const createInvoice = mutation({
  args: {
    apartmentId: v.id("apartments"),
    amount: v.number(),
    type: v.string(),
    date: v.number(),
    status: v.union(v.literal("paid"), v.literal("pending")),
    receiptImageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can create invoices
    await requireAdmin(ctx);

    // Verify that the apartment exists
    const apartment = await ctx.db.get(args.apartmentId);
    if (!apartment) {
      throw new Error("Apartment not found");
    }
    
    const now = Date.now();
    const id = await ctx.db.insert("invoices", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Update an invoice
 */
export const updateInvoice = mutation({
  args: {
    id: v.id("invoices"),
    apartmentId: v.optional(v.id("apartments")),
    amount: v.optional(v.number()),
    type: v.optional(v.string()),
    date: v.optional(v.number()),
    status: v.optional(v.union(v.literal("paid"), v.literal("pending"))),
    receiptImageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update invoices
    await requireAdmin(ctx);

    const { id, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update invoice status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: v.union(v.literal("paid"), v.literal("pending")),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update invoice status
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete an invoice
 */
export const deleteInvoice = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    // Authorization check - only admins can delete invoices
    await requireAdmin(ctx);

    // Get the invoice to check for receipt image
    const invoice = await ctx.db.get(args.id);
    
    // Validate invoice exists before attempting deletion
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    
    if (invoice.receiptImageId) {
      // Delete the associated image from storage
      await ctx.storage.delete(invoice.receiptImageId);
    }
    
    await ctx.db.delete(args.id);
  },
});

/**
 * Get invoice statistics
 */
export const getStats = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const invoices = await ctx.db.query("invoices").collect();
    
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === "paid").length;
    const pending = invoices.filter(i => i.status === "pending").length;
    
    const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0);
    const paidAmount = invoices
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + i.amount, 0);
    const pendingAmount = invoices
      .filter(i => i.status === "pending")
      .reduce((sum, i) => sum + i.amount, 0);
    
    // Group by type
    const byType = invoices.reduce((acc, invoice) => {
      const type = invoice.type;
      if (!acc[type]) {
        acc[type] = { count: 0, totalAmount: 0 };
      }
      acc[type].count++;
      acc[type].totalAmount += invoice.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);
    
    return {
      total,
      paid,
      pending,
      totalAmount,
      paidAmount,
      pendingAmount,
      byType,
    };
  },
});

/**
 * Helper function to get Arabic month name
 */
function getArabicMonth(date: Date): string {
  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  const year = date.getFullYear();
  const month = arabicMonths[date.getMonth()];
  return `${month} ${year}`;
}

/**
 * Internal mutation to generate monthly invoices for all active tenants
 * This is called by the cron job on the 1st of every month
 * 
 * Logic:
 * 1. Query all tenants with status "active" whose leaseEndDate hasn't passed
 * 2. For each active tenant, check if an invoice already exists for the current month
 * 3. If no invoice exists, create a new invoice with the apartment's rentAmount
 */
export const generateMonthlyInvoices = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const currentDate = new Date(now);
    
    // Get current month in Arabic (e.g., "مارس 2026")
    const currentMonthArabic = getArabicMonth(currentDate);
    
    // Calculate due date: 5th of current month at midnight
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 5, 0, 0, 0).getTime();
    
    console.log(`Starting monthly invoice generation for ${currentMonthArabic}...`);
    
    // Query all active tenants whose lease hasn't ended
    // Get all active tenants first, then filter by leaseEndDate in memory
    const activeTenants = await ctx.db
      .query("tenants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    // Filter tenants with unexpired leases
    const validTenants = activeTenants.filter(tenant => tenant.leaseEndDate > now);
    
    console.log(`Found ${validTenants.length} active tenants with unexpired leases`);
    
    let invoicesCreated = 0;
    
    for (const tenant of validTenants) {
      // Check if invoice already exists for this tenant and month
      const existingInvoices = await ctx.db
        .query("invoices")
        .withIndex("by_tenantId", (q) => q.eq("tenantId", tenant._id))
        .collect();
      
      // Filter to only invoices for current month
      const monthInvoices = existingInvoices.filter(inv => inv.month === currentMonthArabic);
      
      // Skip if invoice already exists for this month
      if (monthInvoices.length > 0) {
        console.log(`Invoice already exists for tenant ${tenant.name} (${currentMonthArabic}), skipping`);
        continue;
      }
      
      // Get the apartment to get rent amount
      const apartment = await ctx.db.get(tenant.apartmentId);
      if (!apartment) {
        console.error(`Apartment not found for tenant ${tenant.name}, skipping`);
        continue;
      }
      
      // Create the invoice
      await ctx.db.insert("invoices", {
        apartmentId: tenant.apartmentId,
        tenantId: tenant._id,
        amount: apartment.rentAmount,
        type: "Rent",
        date: now,
        dueDate: dueDate,
        month: currentMonthArabic,
        status: "pending",
        description: ` إيجار شهري - ${currentMonthArabic}`,
        createdAt: now,
        updatedAt: now,
      });
      
      invoicesCreated++;
      console.log(`Created invoice for tenant ${tenant.name}: ${apartment.rentAmount} EGP`);
    }
    
    console.log(`✅ Generated ${invoicesCreated} invoices for ${currentMonthArabic}`);
    return { success: true, invoicesCreated, month: currentMonthArabic };
  },
});
