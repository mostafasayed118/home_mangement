# Comprehensive Bug Report - Building Management Dashboard

**Project:** Home Management - Building Management Dashboard  
**Date:** 2026-02-28  
**Analysis Scope:** Complete codebase review including backend (Convex), frontend (React/Next.js), authentication, API routes, and middleware

---

## Executive Summary

This report documents all bugs, errors, logic issues, security vulnerabilities, and potential performance problems identified in the Building Management Dashboard codebase. A total of **45 issues** were identified across multiple categories.

### Issue Distribution
- **Critical:** 8 issues (Security vulnerabilities, data integrity)
- **High Severity:** 14 issues (Functional bugs, missing validations)
- **Medium Severity:** 12 issues (Code quality, performance)
- **Low Severity:** 11 issues (Minor issues, code smell)

---

## 🚨 CRITICAL ISSUES (Security & Data Integrity)

### 1. Authentication Bypass in Validation Route
**File:** [`app/api/auth/validate/route.ts`](home_mangement/app/api/auth/validate/route.ts:1-27)

**Issue:** The validation route always returns `{ valid: true }` without actually validating credentials:
```typescript
// Lines 21-22 - ALWAYS returns valid without checking!
return NextResponse.json({ valid: true });
```

**Impact:** Any validation check using this endpoint will pass regardless of credentials.

**Recommendation:** Implement proper credential validation or remove this endpoint entirely.

---

### 2. No Duplicate Payment Prevention
**File:** [`convex/payments.ts`](home_mangement/convex/payments.ts:216-242)

**Issue:** The `addPayment` mutation doesn't check if a payment already exists for the same tenant in the same month/year. The `generateMonthlyPayments` function has this check (line 377-388), but manual payment creation doesn't.

**Impact:** Can create duplicate payments for the same period, causing accounting issues.

**Recommendation:** Add uniqueness validation before inserting payment:
```typescript
const existingPayment = await ctx.db
  .query("payments")
  .filter((q) =>
    q.and(
      q.eq(q.field("tenantId"), args.tenantId),
      q.eq(q.field("month"), args.month),
      q.eq(q.field("year"), args.year)
    )
  )
  .first();

if (existingPayment) {
  throw new Error("Payment already exists for this period");
}
```

---

### 3. No Rate Limiting on Authentication Endpoints
**Files:** 
- [`app/api/auth/signin/route.ts`](home_mangement/app/api/auth/signin/route.ts)
- [`app/api/auth/validate/route.ts`](home_mangement/app/api/auth/validate/route.ts)

**Issue:** No rate limiting on sign-in, password reset, or email verification endpoints.

**Impact:** Vulnerable to brute force attacks and credential stuffing.

**Recommendation:** Implement rate limiting using a library like `rate-limiter-flexible`.

---

### 4. Tenant Edit Allows Apartment Change Without Status Update
**File:** [`components/tenants/TenantFormModal.tsx`](home_mangement/components/tenants/TenantFormModal.tsx:144-158)

**Issue:** In edit mode, the `updateTenant` mutation doesn't handle changing apartments. While the apartment selection is shown, changing it doesn't:
1. Mark the old apartment as vacant
2. Mark the new apartment as occupied

**Impact:** Apartment status becomes inconsistent with actual occupancy.

**Recommendation:** Either disable apartment change in edit mode or implement proper status transfer logic.

---

### 5. Missing Validation for Invoice Apartment Existence
**File:** [`convex/invoices.ts`](home_mangement/convex/invoices.ts:137-156)

**Issue:** The `createInvoice` mutation doesn't verify that the apartmentId actually exists in the database before creating an invoice.

**Impact:** Can create invoices for non-existent apartments, leading to data integrity issues.

**Recommendation:** Add apartment existence validation:
```typescript
const apartment = await ctx.db.get(args.apartmentId);
if (!apartment) {
  throw new Error("Apartment not found");
}
```

---

### 6. Maintenance Deletion Doesn't Check Related Records
**File:** [`convex/maintenance.ts`](home_mangement/convex/maintenance.ts:161-166)

**Issue:** Deleting a maintenance record doesn't check if there are related invoices or other records.

**Impact:** Orphaned records and broken referential integrity.

**Recommendation:** Add checks for related records before deletion.

---

### 7. Password Reset Token Expiration Too Short
**File:** [`convex/auth.ts`](home_mangement/convex/auth.ts:9)

**Issue:** Password reset tokens expire in just 1 hour:
```typescript
const PASSWORD_RESET_EXPIRY = 1 * 60 * 60 * 1000; // 1 hour
```

**Impact:** Users may not receive/click the email in time, causing frustration.

**Recommendation:** Increase to 24 hours (same as email verification).

---

### 8. Token Generation Uses Weak Random
**File:** [`app/api/auth/signin/route.ts`](home_mangement/app/api/auth/signin/route.ts:9-16)

**Issue:** Session tokens use `Math.random()` which is cryptographically weak:
```typescript
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length)); // WEAK!
  }
  return result;
}
```

**Impact:** Tokens can be predicted, leading to session hijacking.

**Recommendation:** Use `crypto.randomBytes()` like in `convex/auth.ts`.

---

## 🔴 HIGH SEVERITY ISSUES

### 9. Duplicate Function Definitions in Apartments
**File:** [`convex/apartments.ts`](home_mangement/convex/apartments.ts:65-82 and 87-104)

**Issue:** Two identical functions for creating apartments: `create` and `addApartment`.

**Recommendation:** Remove duplicate, keep `addApartment`.

---

### 10. Duplicate Delete Functions in Apartments
**File:** [`convex/apartments.ts`](home_mangement/convex/apartments.ts:140-156 and 162-167)

**Issue:** Two delete functions - `deleteApartment` (with validation) and `remove` (without validation).

**Recommendation:** Remove `remove` or make it internal-only.

---

### 11. Missing Transaction Handling for Critical Operations
**File:** [`convex/tenants.ts`](home_mangement/convex/tenants.ts:151-169)

**Issue:** `addTenant` performs two database operations without atomic transaction:
1. Create tenant
2. Update apartment status

**Impact:** If second operation fails, data becomes inconsistent.

---

### 12. Missing Validation for Duplicate Unit Labels
**File:** [`convex/apartments.ts`](home_mangement/convex/apartments.ts:65-82)

**Issue:** No check for duplicate `unitLabel` before insertion.

**Impact:** Multiple apartments can have the same label (e.g., "1-A").

---

### 13. Missing Validation for Duplicate Tenant National ID
**File:** [`convex/tenants.ts`](home_mangement/convex/tenants.ts:141-171)

**Issue:** No check for duplicate `nationalId`.

**Impact:** Same person can register multiple times.

---

### 14. Partial Payment Amount Validation Incomplete
**File:** [`components/payments/PaymentFormModal.tsx`](home_mangement/components/payments/PaymentFormModal.tsx:129-143)

**Issue:** Only validates that partial payment < rent amount, but doesn't check for negative or zero amounts.

**Recommendation:** Add:
```typescript
if (amount <= 0) {
  setError("المبلغ يجب أن يكون أكبر من صفر");
  return;
}
```

---

### 15. No Email Format Validation in Sign-Up
**File:** [`app/(auth)/sign-up/page.tsx`](home_mangement/app/(auth)/sign-up/page.tsx)

**Issue:** Uses `type="email"` but no regex validation for email format.

**Impact:** Invalid email formats can be submitted.

---

### 16. Missing Index on Tenants nationalId
**File:** [`convex/schema.ts`](home_mangement/convex/schema.ts:61-87)

**Issue:** No index on `nationalId` field.

**Impact:** Slow lookups when searching by national ID.

---

### 17. No Uniqueness Index on Apartments unitLabel
**File:** [`convex/schema.ts`](home_mangement/convex/schema.ts:42-58)

**Issue:** Has index but not unique index on `unitLabel`.

**Impact:** Can still insert duplicates at database level.

---

### 18. Inconsistent Error Handling in API Routes
**File:** [`app/api/auth/signin/route.ts`](home_mangement/app/api/auth/signin/route.ts:91-94)

**Issue:** Returns generic "Internal server error" without logging details in production.

**Recommendation:** Log full error details server-side, return generic message to client.

---

### 19. Missing Authorization Checks
**Files:** All Convex mutations and queries

**Issue:** No role-based access control checks. All authenticated users can access all data.

**Impact:** Any admin can view/modify all records.

**Recommendation:** Add user role validation in mutations.

---

### 20. Search Uses Multiple Queries Instead of Single OR Query
**File:** [`convex/tenants.ts`](home_mangement/convex/tenants.ts:16-36)

**Issue:** Searches name and phone separately then merges:
```typescript
const nameResults = await ctx.db.query("tenants")
  .withSearchIndex("search_by_name", ...)
  .collect();
const phoneResults = await ctx.db.query("tenants")
  .withSearchIndex("search_by_phone", ...)
  .collect();
```

**Impact:** Performance issue - should use single query.

---

### 21. No Input Sanitization on User-Provided Data
**Files:** All form components

**Issue:** User inputs aren't sanitized before storage.

**Impact:** Potential XSS if data is rendered unsafely.

---

### 22. Payment Date Can Be Future Dated
**File:** [`components/payments/PaymentFormModal.tsx`](home_mangement/components/payments/PaymentFormModal.tsx:348-361)

**Issue:** No validation preventing payment date from being in the future.

**Impact:** Can record payments that haven't happened yet.

---

## 🟡 MEDIUM SEVERITY ISSUES

### 23. Type Casting with `as any` in Multiple Locations
**Files:**
- [`app/(dashboard)/payments/page.tsx`](home_mangement/app/(dashboard)/payments/page.tsx:186-192)
- [`components/payments/PaymentFormModal.tsx`](home_mangement/components/payments/PaymentFormModal.tsx:249)

**Issue:** Using `as any` bypasses TypeScript type checking.

---

### 24. Inconsistent Toast Usage
**Files:** Various components

**Issue:** Some use `addToast()`, others use `alert()`.

---

### 25. Missing Dark Mode Support
**Files:** All components

**Issue:** Many components use hardcoded light theme colors.

---

### 26. Unused Variable in TenantFormModal
**File:** [`components/tenants/TenantFormModal.tsx`](home_mangement/components/tenants/TenantFormModal.tsx:148)

**Issue:** `currentTenant` is assigned but never used.

---

### 27. Missing Accessibility Labels
**Files:** All form components

**Issue:** Inputs lack proper aria labels and descriptions.

---

### 28. Hardcoded Currency in utils.ts
**File:** [`lib/utils.ts`](home_mangement/lib/utils.ts:18-23)

**Issue:** `formatCurrency` uses USD while app uses EGP.

---

### 29. Missing Loading States for Delete Operations
**Files:** All page components

**Issue:** Delete doesn't disable all interactions, only shows loading.

---

### 30. No Confirmation for Edit Cancellation
**Files:** All form modals

**Issue:** Closing modal doesn't warn about unsaved changes.

---

### 31. Missing Pagination for Large Datasets
**Files:** All page components

**Issue:** All data loaded at once with `.collect()`.

---

### 32. No Sorting Options for Tables
**Files:** All page components

**Issue:** Tables have no sorting functionality.

---

### 33. Missing Filter Functionality
**Files:** All page components

**Issue:** No filtering capability for tables.

---

### 34. getByStatus Not Enriched in Payments
**File:** [`convex/payments.ts`](home_mangement/convex/payments.ts:83-98)

**Issue:** Returns raw data without tenant/apartment enrichment.

---

### 35. getByTenant in Payments Not Enriched
**File:** [`convex/payments.ts`](home_mangement/convex/payments.ts:126-134)

**Issue:** Returns raw data without tenant/apartment enrichment.

---

## 🟢 LOW SEVERITY ISSUES

### 36. Missing Error Boundaries
**Files:** All pages

**Issue:** No React error boundaries to handle runtime errors gracefully.

---

### 37. No Offline Support
**Files:** All components

**Issue:** No offline detection or handling.

---

### 38. getApartmentStatusColor Missing "reserved" Case
**File:** [`lib/utils.ts`](home_mangement/lib/utils.ts:108-119)

**Issue:** Switch statement doesn't handle "reserved" status.

---

### 39. Date Parsing Without Timezone Handling
**Files:** Multiple components

**Issue:** Dates parsed without considering timezone differences.

---

### 40. Duplicate Status Translation Objects
**Files:** Multiple files

**Issue:** Status labels defined in multiple places (page.tsx files, i18n.ts, utils.ts).

---

### 41. Console.log in Production Code
**File:** [`lib/auth-context.tsx`](home_mangement/lib/auth-context.tsx:135)

**Issue:** Development-only console.log for verification links not fully guarded.

---

### 42. Missing Minimum Password Length Validation
**File:** [`app/(auth)/sign-up/page.tsx`](home_mangement/app/(auth)/sign-up/page.tsx)

**Issue:** No minimum password length requirement.

---

### 43. No HTTPS Enforcement in Development
**File:** [`middleware.ts`](home_mangement/middleware.ts)

**Issue:** No redirect to HTTPS in production.

---

### 44. Hardcoded Year Range
**File:** [`components/payments/PaymentFormModal.tsx`](home_mangement/components/payments/PaymentFormModal.tsx:282-283)

**Issue:** Year input min=2020, max=2050 is hardcoded.

---

### 45. Incomplete Type Definitions
**Files:** Multiple components

**Issue:** Some interfaces defined inline rather than shared types.

---

## ✅ PREVIOUSLY FIXED ISSUES

The following issues from the previous report have been resolved:

1. ✅ BuildingGrid Hardcoded Floor Values
2. ✅ Payment Date Default Value (0 vs undefined)
3. ✅ Maintenance Stats Array Mutation
4. ✅ Arabic Pluralization (dual form handling)
5. ✅ getCurrentMonth Not Enriched
6. ✅ Tenant Edit Mode - Missing Apartment Selection
7. ✅ Form Validations (lease dates, amounts)
8. ✅ Year Range Extended
9. ✅ endLease Validation

---

## Recommended Priority Actions

### Immediate (Critical)
1. Fix authentication bypass in validate route
2. Add duplicate payment prevention
3. Implement rate limiting
4. Fix tenant apartment change logic
5. Add invoice apartment validation
6. Fix weak token generation

### High Priority
7. Add transaction handling
8. Implement unique indexes
9. Add authorization checks
10. Fix input validation

### Medium Priority
11. Add pagination
12. Add sorting/filtering
13. Improve error handling
14. Add dark mode support

### Lower Priority
15. Refactor duplicate code
16. Add error boundaries
17. Improve accessibility
18. Add offline support
