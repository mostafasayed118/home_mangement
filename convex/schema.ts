import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores admin user accounts
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.optional(v.string()), // PBKDF2 salt for secure password hashing
    name: v.optional(v.string()),
    emailVerified: v.boolean(),
    role: v.literal("admin"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"]),

  // Auth tokens table - stores session tokens
  authTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_token", ["token"]),

  // Verification tokens table - for email verification and password reset
  verificationTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    type: v.union(
      v.literal("email_verification"),
      v.literal("password_reset")
    ),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_token", ["token"]),

  // Apartments table - stores all units in the building
  apartments: defineTable({
    floor: v.number(),           // 1-6
    unitNumber: v.string(),      // "A" or "B"
    unitLabel: v.string(),       // e.g., "1-A", "2-B"
    status: v.union(
      v.literal("occupied"),
      v.literal("vacant"),
      v.literal("maintenance"),
      v.literal("reserved")      // Reserved for pending tenants
    ),
    rentAmount: v.number(),      // Monthly rent (variable per apartment)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_floor", ["floor"])
    .index("by_unitLabel", ["unitLabel"])
    .index("by_status", ["status"]),

  // Tenants table - stores tenant information linked to apartments
  tenants: defineTable({
    apartmentId: v.id("apartments"),
    name: v.string(),
    phone: v.string(),
    nationalId: v.string(),
    depositAmount: v.number(),   // Security deposit
    leaseStartDate: v.number(),  // Timestamp
    leaseEndDate: v.number(),    // Timestamp
    contractFileId: v.optional(v.id("_storage")), // Lease contract file
    isActive: v.boolean(),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending")
    )),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_apartmentId", ["apartmentId"])
    .index("by_isActive", ["isActive"])
    .index("by_status", ["status"])
    .index("by_leaseEndDate", ["leaseEndDate"])
    .index("by_nationalId", ["nationalId"])
    .searchIndex("search_by_name", {
      searchField: "name",
    })
    .searchIndex("search_by_phone", {
      searchField: "phone",
    })
    .searchIndex("search_by_nationalId", {
      searchField: "nationalId",
    }),

  // Payments table - tracks rent payments
  payments: defineTable({
    tenantId: v.id("tenants"),
    apartmentId: v.id("apartments"),
    amount: v.number(),
    dueDate: v.number(),         // Timestamp
    paymentDate: v.number(),    // Timestamp (0 or null if not paid)
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("late"),
      v.literal("partial")
    ),
    notes: v.optional(v.string()), // Optional notes for partial payments
    month: v.number(),           // 1-12
    year: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_apartmentId", ["apartmentId"])
    .index("by_status", ["status"])
    .index("by_month_year", ["month", "year"])
    .index("by_dueDate", ["dueDate"]),

  // Maintenance table - tracks repair costs and expenses
  maintenance: defineTable({
    apartmentId: v.optional(v.id("apartments")), // null for general building expenses
    title: v.string(),
    cost: v.number(),
    date: v.number(),           // Timestamp
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("done")
    ),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_apartmentId", ["apartmentId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"]),

  // Invoices table - tracks utility bills and other invoices
  invoices: defineTable({
    apartmentId: v.id("apartments"),
    amount: v.number(),
    type: v.string(),           // e.g., "Electricity", "Water", "Maintenance"
    date: v.number(),           // Timestamp
    status: v.union(
      v.literal("paid"),
      v.literal("pending")
    ),
    receiptImageId: v.optional(v.id("_storage")), // Storage ID for uploaded receipt image
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_apartmentId", ["apartmentId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"])
    .index("by_type", ["type"]),

  // Monthly Summaries table - stores monthly financial snapshots
  monthlySummaries: defineTable({
    month: v.number(),         // 1-12
    year: v.number(),
    totalIncome: v.number(),   // Total collected rent for that month
    totalExpenses: v.number(), // Total maintenance/other costs for that month
    netProfit: v.number(),     // Income - Expenses
    notes: v.optional(v.string()), // Admin's text notes
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_month_year", ["month", "year"]),

  // Documents table - stores building documents (water bills, ownership papers, etc.)
  documents: defineTable({
    title: v.string(),
    type: v.string(), // e.g., "فاتورة مياه", "ملكية", "عقد", "أخرى"
    fileId: v.id("_storage"),
    uploadDate: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_uploadDate", ["uploadDate"]),
});
