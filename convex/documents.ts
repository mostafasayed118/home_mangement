import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Authorization helper function
 * Checks if the current user is authenticated and has admin role
 *
 * SECURITY: This function ONLY uses server-side authentication context.
 * It NEVER accepts client-supplied email or user data for authorization.
 */
async function requireAdmin(ctx: any): Promise<{ isAdmin: boolean; userId: string }> {
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
    .withIndex("by_email", (q: any) => q.eq("email", userEmail))
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
 * Generate an upload URL for files
 * Returns a URL that can be used to upload a file directly to Convex storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Authorization check - only admins can upload files
    await requireAdmin(ctx);
    // Generate upload URL for up to 50MB files
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save document metadata after file upload
 */
export const saveDocument = mutation({
  args: {
    title: v.string(),
    type: v.string(),
    fileId: v.id("_storage"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can save documents
    await requireAdmin(ctx);
    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      type: args.type,
      fileId: args.fileId,
      uploadDate: now,
      notes: args.notes,
      createdAt: now,
    });
    return documentId;
  },
});

/**
 * Get all documents, sorted by upload date (newest first)
 * Maps fileId to readable URLs
 */
export const getDocuments = query({
  handler: async (ctx) => {
    // Authorization check
    await requireAdmin(ctx);
    const documents = await ctx.db.query("documents").collect();
    
    // Sort by upload date descending
    const sortedDocuments = documents.sort((a, b) => b.uploadDate - a.uploadDate);
    
    // Map fileIds to URLs
    const documentsWithUrls = await Promise.all(
      sortedDocuments.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.fileId);
        return {
          ...doc,
          fileUrl: url,
        };
      })
    );
    
    return documentsWithUrls;
  },
});

/**
 * Get documents by type
 */
export const getDocumentsByType = query({
  args: {
    type: v.string(),
  },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
    
    // Map fileIds to URLs
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.fileId);
        return {
          ...doc,
          fileUrl: url,
        };
      })
    );
    
    return documentsWithUrls;
  },
});

/**
 * Delete a document
 */
export const deleteDocument = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can delete documents
    await requireAdmin(ctx);
    
    const document = await ctx.db.get(args.id);
    if (document) {
      // Delete the file from storage
      await ctx.storage.delete(document.fileId);
      // Delete the document record
      await ctx.db.delete(args.id);
    }
  },
});

/**
 * Get document by ID
 */
export const getDocumentById = query({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Authorization check
    await requireAdmin(ctx);
    const document = await ctx.db.get(args.id);
    if (document) {
      const url = await ctx.storage.getUrl(document.fileId);
      return {
        ...document,
        fileUrl: url,
      };
    }
    return null;
  },
});

/**
 * Update document metadata
 */
export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    type: v.optional(v.string()),
    notes: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Authorization check - only admins can update documents
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});
