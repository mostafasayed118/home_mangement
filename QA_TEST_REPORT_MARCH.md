# Software Testing & QA Report
**Project:** Home Management Dashboard  
**Date:** March 2026  
**Type:** Comprehensive Logic & Security Audit  

## Executive Summary
After an in-depth code review of the `home_mangement` project following recent fixes, I have discovered **major critical flaws** that still exist in the system. While many issues from previous reports were resolved (like mutation schemas and basic validations), there are **severe logical miscalculations in revenue tracking** and **massive data leak vulnerabilities**.

---

## 🚨 CRITICAL SEVERITY: Security & Data Leaks

### 1. Convex Queries Lack Authentication Checks (Massive Data Leak)
**Files:** `convex/apartments.ts`, `convex/tenants.ts`, `convex/payments.ts`
**Description:** While all `mutation` endpoints correctly implement a `requireAdmin(ctx)` check, **none of the `query` endpoints do**. 
**Impact:** Because Convex exposes these queries over its public URL, **anyone on the internet** can fetch the entire database of tenants (including national IDs, names, phones), apartments, and payments without logging in. The Next.js `middleware.ts` only protects the frontend routes, it does not magically protect the Convex backend database.
**Fix:** Add `await requireAdmin(ctx);` to the beginning of the handlers for all `query` definitions.

### 2. Main Dashboard Layout Exposes Internal UI
**File:** `middleware.ts`
**Description:** The root path `/'` is listed in `publicRoutes`. This completely bypasses the Next.js middleware token check for the dashboard.
**Impact:** Anonymous users navigating to the domain root can view the dashboard UI. Combined with the public Convex queries (Bug #1), an unauthenticated user will see the fully populated dashboard with all financial stats.
**Fix:** Remove `'/'` from `publicRoutes`. Ensure only actual public pages (`/sign-in`, etc.) are unprotected.

---

## 🚨 CRITICAL SEVERITY: Financial & Logic Miscalculations

### 3. Partial Payments Break Financial Statistics
**Files:** `convex/payments.ts` (`getBuildingStats`), `convex/summaries.ts` (`calculateMonthPreview`)
**Description:** The system miscalculates revenue whenever a "partial" payment is made.
* **Bug 3a:** `collected` revenue completely ignores partial payments. If a tenant pays 4,000 EGP out of 5,000 as a partial payment, `collected` does not increase by 4,000.
* **Bug 3b:** `outstanding` debt incorrectly treats the partial payment `amount` as the debt instead of the money paid. In `getBuildingStats`: 
  `partial.reduce((sum, p) => sum + p.amount, 0)`
  This adds the *paid amount* to the *outstanding balance*, which is completely backwards. It should either calculate `rentAmount - p.amount` or handle it correctly.
* **Bug 3c:** In `calculateMonthPreview`, `totalIncome` only sums payments with status `"paid"`, entirely ignoring money collected via partial payments.
**Fix:** Refactor logic to correctly sum partial payment `amount` into collected revenue, and sum `(apartment.rentAmount - p.amount)` into outstanding debt.

### 4. Duplicate Payments By Bypassing the "Late" Check
**File:** `convex/payments.ts` (`addPayment`)
**Description:** The duplicate payment prevention logic only checks if a `paid` or `pending` payment already exists for the month:
`q.or(q.eq(q.field("status"), "paid"), q.eq(q.field("status"), "pending"))`
**Impact:** If a tenant has a `late` payment, the system allows the landlord to mistakenly create a brand new pending payment for the exact same month and year, creating duplicate financial records.
**Fix:** Add `q.eq(q.field("status"), "late")` to the `OR` condition.

---

## 🟠 HIGH SEVERITY: Data Integrity Bypasses 

### 5. Over-Occupancy Multiple Active Tenants Bug
**File:** `convex/tenants.ts` (`addTenant`)
**Description:** The `updateStatus` method correctly prevents activating a tenant if the apartment is already occupied. However, `addTenant` bypasses this check entirely.
**Impact:** A user can add a new active tenant to an apartment that is *already occupied* by another active tenant. Both tenants will become active, and the apartment status is blindly set to `"occupied"`, creating corrupted multi-tenant states.
**Fix:** Ensure `addTenant` checks if `apartment.status === "occupied"` and if an active tenant already exists for that apartment before insertion.

### 6. Validation Bypasses on Edit/Update Actions
**Files:** `convex/apartments.ts` (`updateApartment`), `convex/tenants.ts` (`updateTenant`)
**Description:** The `add*` mutations have strict validations that the `update*` mutations completely lack.
* **Apartments:** `addApartment` normalizes `unitLabel` to uppercase and enforces uniqueness. `updateApartment` does neither. You can edit an apartment to create duplicate unit labels (e.g., two "1-A"s) and bypass the casing standard.
* **Tenants:** `addTenant` enforces uniqueness on `nationalId` and ensures `leaseEndDate > leaseStartDate`. `updateTenant` skips both of these checks, allowing invalid dates and duplicate IDs.
**Fix:** Extract validation logic into shared helper functions and run them inside both `add*` and `update*` mutations.

### 7. Dangling Pointers on Apartment Deletion
**File:** `convex/apartments.ts` (`deleteApartment`)
**Description:** `deleteApartment` prevents deleting an apartment *if it has an active tenant*. However, it allows deletion if it has *inactive* tenants or historical *payments*. 
**Impact:** Deleting the apartment breaks relational links. Queries trying to fetch the deleted apartment (like `getAll` in `payments.ts`) will return `null` for `apartment`, which causes runtime rendering errors on the frontend because components expect `apartment` data.
**Fix:** EITHER prevent deleting an apartment if it has ANY tenant history / payments, OR soft-delete the apartment (`isDeleted: true`), OR safely handle `null` apartments gracefully across the entire frontend UI.

---

## Conclusion
The application suffers from a critical data leak due to unprotected Convex query endpoints. Fixing `requireAdmin` across all queries is the highest immediate priority. Secondly, the financial calculations MUST be rewritten to accurately handle the `partial` payment status before the landlord starts using the system for accounting.
