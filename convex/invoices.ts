import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Type for enriched invoice with apartment and receipt URL
 */
type EnrichedInvoice = Doc<"invoices"> & {
  apartment: Doc<"apartments"> | null;
  receiptImageUrl: string | null;
};

/**
 * Helper function to enrich a single invoice with apartment info and receipt URL
 */
async function enrichInvoice(
  ctx: any,
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
  ctx: any,
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
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get all invoices with apartment info and image URLs
 */
export const getAll = query({
  handler: async (ctx) => {
    const invoices = await ctx.db.query("invoices").collect();
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
