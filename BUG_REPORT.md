# Software Testing Report - Building Management Dashboard

**Project:** Home Management - Building Management Dashboard  
**Date:** 2026-02-21  
**Tester:** Code Analysis  

---

## Executive Summary

This report documents all bugs, errors, and wrong logic identified in the Building Management Dashboard codebase. A total of **24 issues** were identified across backend, frontend, and data handling layers.

---

## CRITICAL BUGS (High Severity)

### 1. Duplicate Function Definitions (Code Duplication)
**File:** [`convex/tenants.ts`](home_mangement/convex/tenants.ts)
**Lines:** 148-165 and 209-226

**Issue:** The `updateTenant` function is defined twice with identical implementations.

```typescript
// First definition (line 148)
export const updateTenant = mutation({ ... });

// Second definition (line 209)  
export const update = mutation({ ... });
```

**Impact:** Both mutations work identically, causing confusion and potential maintenance issues. The second one (`update`) should likely have different functionality or be removed.

---

### 2. Duplicate Delete Mutations
**File:** [`convex/tenants.ts`](home_mangement/convex/tenants.ts)
**Lines:** 170-204 and 258-292

**Issue:** Both `deleteTenant` and `remove` functions are identical - they check for outstanding payments and delete the tenant.

**Impact:** Redundant code that increases bundle size and causes confusion.

---

### 3. Duplicate Delete Mutations in Payments
**File:** [`convex/payments.ts`](home_mangement/convex/payments.ts)
**Lines:** 261-266 and 345-350

**Issue:** Both `deletePayment` and `remove` functions are identical.

---

### 4. Duplicate Delete Mutations in Maintenance
**File:** [`convex/maintenance.ts`](home_mangement/convex/maintenance.ts)
**Lines:** 160-165 and 210-215

**Issue:** Both `deleteMaintenance` and `remove` functions are identical.

---

### 5. Duplicate Update Mutations in Maintenance
**File:** [`convex/maintenance.ts`](home_mangement/convex/maintenance.ts)
**Lines:** 135-155 and 190-205

**Issue:** `updateMaintenance` and `update` functions have different parameters:
- `updateMaintenance` includes `status` parameter
- `update` does NOT include `status` parameter

**Impact:** Inconsistent API behavior - updating maintenance without status might leave it unchanged.

---

### 6. Missing Apartment Status Update When Lease Ends
**File:** [`convex/tenants.ts`](home_mangement/convex/tenants.ts)
**Lines:** 231-253 (`endLease` function)

**Issue:** When ending a lease, the apartment status is updated to "vacant" BUT there's no validation to check if the tenant was actually active.

```typescript
export const endLease = mutation({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    const now = Date.now();
    
    // Mark tenant as inactive
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: now,
    });
    
    // Update apartment status to vacant - BUT no check if tenant was active!
    await ctx.db.patch(tenant.apartmentId, {
      status: "vacant",
      updatedAt: now,
    });
  },
});
```

**Impact:** If `endLease` is called on an already inactive tenant, the apartment will be incorrectly marked as vacant (could already be occupied by a new tenant).

---

## MEDIUM SEVERITY ISSUES

### 7. Payment Date Handling - Incorrect Default Value
**File:** [`components/payments/PaymentFormModal.tsx`](home_mangement/components/payments/PaymentFormModal.tsx)
**Lines:** 115, 127

**Issue:** When payment date is not provided, it's set to `0` instead of `null`:

```typescript
paymentDate: paymentDate ? new Date(paymentDate).getTime() : 0,
```

**Impact:** The value `0` is a valid timestamp (Unix epoch: January 1, 1970), which could be misinterpreted as "paid" on that date instead of "not paid".

---

### 8. BuildingGrid Hardcoded Floor Values
**File:** [`components/dashboard/BuildingGrid.tsx`](home_mangement/components/dashboard/BuildingGrid.tsx)
**Line:** 32

```typescript
const floors = [1, 2, 3, 4, 5, 6];
```

**Issue:** The number of floors is hardcoded. If apartments are added with more floors, they won't be displayed.

**Impact:** New floors (7+) will not appear in the building grid visualization.

---

### 9. No Validation for Rent Amount
**File:** [`components/apartments/ApartmentFormModal.tsx`](home_mangement/components/apartments/ApartmentFormModal.tsx)
**Lines:** 169-177

**Issue:** The rent amount can be 0 or negative (validation only checks for min=0):

```typescript
<Input
  id="rentAmount"
  type="number"
  min={0}
  value={rentAmount}
  onChange={(e) => setRentAmount(parseFloat(e.target.value) || 0)}
  className="col-span-3"
  required
/>
```

**Impact:** Zero or very low rent amounts can be saved, which may not be intended.

---

### 10. No Validation for Lease Dates
**File:** [`components/tenants/TenantFormModal.tsx`](home_mangement/components/tenants/TenantFormModal.tsx)
**Lines:** 229-255

**Issue:** No validation that lease end date is after start date:

```typescript
<Input
  id="leaseEndDate"
  type="date"
  value={leaseEndDate}
  onChange={(e) => setLeaseEndDate(e.target.value)}
  className="col-span-3"
  required
/>
```

**Impact:** Users can create leases where end date is before start date.

---

### 11. No Validation for Payment Amount
**File:** [`components/payments/PaymentFormModal.tsx`](home_mangement/components/payments/PaymentFormModal.tsx)
**Lines:** 239-247

**Issue:** Amount can be 0:

```typescript
<Input
  id="amount"
  type="number"
  min={0}
  value={amount}
  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
  className="col-span-3"
  required
/>
```

---

### 12. No Validation for Maintenance Cost
**File:** [`components/maintenance/MaintenanceFormModal.tsx`](home_mangement/components/maintenance/MaintenanceFormModal.tsx)
**Lines:** 188-196

**Issue:** Cost can be 0:

```typescript
<Input
  id="cost"
  type="number"
  min={0}
  value={cost}
  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
  className="col-span-3"
  required
/>
```

---

### 13. Payment Filter by Month/Year Returns Unenriched Data
**File:** [`convex/payments.ts`](home_mangement/convex/payments.ts)
**Lines:** 27-38 (`getCurrentMonth` function)

**Issue:** `getCurrentMonth` doesn't enrich payments with tenant/apartment info while `getByMonthYear` does:

```typescript
// getCurrentMonth (line 33-36)
return await ctx.db
  .query("payments")
  .withIndex("by_month_year", (q) => q.eq("month", month).eq("year", year))
  .collect();  // Returns raw data!

// getByMonthYear (line 56-65) - returns enriched data
```

**Impact:** Dashboard might show incomplete payment information.

---

### 14. Tenant Edit Mode - Missing Apartment Selection
**File:** [`components/tenants/TenantFormModal.tsx`](home_mangement/components/tenants/TenantFormModal.tsx)
**Lines:** 151-172

**Issue:** When editing a tenant, the apartment dropdown is hidden:

```typescript
{!isEdit && (
  <div className="grid grid-cols-4 items-center gap-4">
    <Label htmlFor="apartment" className="text-start">
      الشقة
    </Label>
    ...
  </div>
)}
```

**Impact:** Cannot reassign a tenant to a different apartment when editing.

---

### 15. Unused Function - `addMaintenanceRecord` Wrapper
**File:** [`components/maintenance/MaintenanceFormModal.tsx`](home_mangement/components/maintenance/MaintenanceFormModal.tsx)
**Lines:** 118-127

**Issue:** Dead code - an unused function wrapper:

```typescript
const addMaintenanceRecord = async (args: {...}) => {
  return addMaintenance(args as any);
};
```

**Impact:** This function is never called and serves no purpose.

---

### 16. Arabic Pluralization Logic Incorrect
**File:** [`lib/i18n.ts`](home_mangement/lib/i18n.ts)
**Lines:** 127-131

```typescript
export function getArabicPlural(count: number, singular: string, plural: string): string {
  if (count === 1) return singular;
  if (count === 2) return singular; // Arabic dual form
  return plural;
}
```

**Issue:** The function returns `singular` for count=2, but Arabic dual form is different from singular (e.g., "شقة" vs "شقتان").

**Impact:** Incorrect Arabic grammar for the number 2.

---

### 17. Partial Payment Amount Not Tracked
**File:** [`components/payments/PaymentFormModal.tsx`](home_mangement/components/payments/PaymentFormModal.tsx)
**Lines:** 320-340

**Issue:** When recording a partial payment, the user can enter any amount, but there's no validation that it's less than the full rent amount.

---

### 18. `getStats` in Maintenance Not Sorted
**File:** [`convex/maintenance.ts`](home_mangement/convex/maintenance.ts)
**Lines:** 90-92

```typescript
const recent = maintenance
  .sort((a, b) => b.date - a.date)
  .slice(0, 5);
```

**Issue:** The `sort()` method mutates the original array. Should use `[...maintenance].sort()` to avoid mutation.

**Impact:** Potential side effects if the array is used elsewhere.

---

### 19. BuildingStats Missing Apartment Enrichment
**File:** [`convex/payments.ts`](home_mangement/convex/payments.ts)
**Lines:** 151-197

**Issue:** `getBuildingStats` doesn't check if apartments are actually linked to existing records (potential orphaned data).

---

### 20. Missing Year Validation in Payment Form
**File:** [`components/payments/PaymentFormModal.tsx`](home_mangement/components/payments/PaymentFormModal.tsx)
**Lines:** 223-233

**Issue:** Year input allows values from 2020-2030, which is restrictive:

```typescript
<Input
  id="year"
  type="number"
  min={2020}
  max={2030}
  value={year}
  onChange={(e) => setYear(parseInt(e.target.value))}
  className="col-span-3"
  required
/>
```

---

## LOW SEVERITY ISSUES

### 21. Type Casting with `as any`
**File:** [`app/tenants/page.tsx`](home_mangement/app/tenants/page.tsx)
**Line:** 141

```typescript
<TableCell>{(tenant as any).apartment?.unitLabel || "-"}</TableCell>
```

**Impact:** Using `as any` bypasses TypeScript type checking.

---

### 22. Same Type Casting in Payments Page
**File:** [`app/payments/page.tsx`](home_mangement/app/payments/page.tsx)
**Lines:** 174, 177, 180

```typescript
{monthNames[(payment as any).month]} {(payment as any).year}
{(payment as any).tenant?.name || "-"}
{(payment as any).apartment?.unitLabel || "-"}
```

---

### 23. Same Type Casting in Maintenance Page
**File:** [`app/maintenance/page.tsx`](home_mangement/app/maintenance/page.tsx)
**Line:** 172

```typescript
<TableCell>{(record as any).apartment?.unitLabel || "عام"}</TableCell>
```

---

### 24. BuildingGrid - Type Casting
**File:** [`components/dashboard/BuildingGrid.tsx`](home_mangement/components/dashboard/BuildingGrid.tsx)

**Issue:** Interface doesn't match the enriched data structure from backend.

---

## ARCHITECTURE ISSUES

### 25. Missing Error Boundaries
**Files:** All pages

**Issue:** No React error boundaries to handle runtime errors gracefully.

---

### 26. No Loading States for Mutations
**Files:** All form modals

**Issue:** While forms show `isLoading` state, there's no error toast/success notification after operations complete.

---

### 27. No Pagination
**Files:** All data tables

**Issue:** All data is loaded at once. With many records, this could cause performance issues.

---

## RECOMMENDATIONS

### Priority 1 (Critical - Fix Immediately)
1. Remove duplicate mutations (`update`/`updateTenant`, `remove`/`deleteTenant`, etc.)
2. Fix the apartment status update validation in `endLease`
3. Change payment date default from `0` to `null`

### Priority 2 (High - Fix Soon)
1. Add proper validation for dates, amounts, and form fields
2. Fix hardcoded floor values in BuildingGrid
3. Add apartment selection in tenant edit mode
4. Fix the Arabic pluralization function
5. Fix the array mutation bug in maintenance stats

### Priority 3 (Medium - Consider)
1. Remove unused code
2. Add proper TypeScript typing instead of `as any`
3. Add pagination for large datasets
4. Add success/error notifications

---

## TESTING COVERAGE NOTES

The following areas need manual testing:
- End lease flow - verify apartment status updates correctly
- Payment creation with different statuses
- Building grid with apartments on floors > 6
- Arabic plural forms for number 2
- Form validations (date ranges, amounts)

---

*Report generated by code analysis - manual testing recommended for all identified issues.*
