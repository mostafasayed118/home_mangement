/**
 * Seed Script for Building Management Dashboard
 * 
 * This script populates the database with:
 * - 12 apartments (6 floors x 2 units)
 * - 12 tenants (one per apartment)
 * - Sample payments for the current month
 * - Sample maintenance records
 * 
 * Run with: npx convex run --script scripts/seed.ts
 */

import { internalMutation } from "../convex/_generated/server";
import { v } from "convex/values";

const apartmentsData = [
  { floor: 1, unitNumber: "A", unitLabel: "1-A", rentAmount: 600 },
  { floor: 1, unitNumber: "B", unitLabel: "1-B", rentAmount: 550 },
  { floor: 2, unitNumber: "A", unitLabel: "2-A", rentAmount: 600 },
  { floor: 2, unitNumber: "B", unitLabel: "2-B", rentAmount: 575 },
  { floor: 3, unitNumber: "A", unitLabel: "3-A", rentAmount: 650 },
  { floor: 3, unitNumber: "B", unitLabel: "3-B", rentAmount: 600 },
  { floor: 4, unitNumber: "A", unitLabel: "4-A", rentAmount: 700 },
  { floor: 4, unitNumber: "B", unitLabel: "4-B", rentAmount: 625 },
  { floor: 5, unitNumber: "A", unitLabel: "5-A", rentAmount: 750 },
  { floor: 5, unitNumber: "B", unitLabel: "5-B", rentAmount: 700 },
  { floor: 6, unitNumber: "A", unitLabel: "6-A", rentAmount: 800 },
  { floor: 6, unitNumber: "B", unitLabel: "6-B", rentAmount: 750 },
];

const tenantNames = [
  "John Smith",
  "Sarah Johnson",
  "Michael Brown",
  "Emily Davis",
  "David Wilson",
  "Jennifer Martinez",
  "Robert Anderson",
  "Lisa Taylor",
  "James Thomas",
  "Maria Garcia",
  "William Jackson",
  "Patricia White",
];

const maintenanceTitles = [
  { title: "Plumbing repair - bathroom", cost: 150 },
  { title: "AC filter replacement", cost: 75 },
  { title: "Electrical outlet fix", cost: 100 },
  { title: "Lock replacement", cost: 80 },
  { title: "Window seal repair", cost: 120 },
];

async function seed(ctx: any) {
  const now = Date.now();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Calculate lease dates (6 months ago to 6 months from now)
  const leaseStart = new Date();
  leaseStart.setMonth(leaseStart.getMonth() - 6);
  const leaseEnd = new Date();
  leaseEnd.setMonth(leaseEnd.getMonth() + 6);

  // Create apartments
  const apartmentIds: string[] = [];
  for (const apt of apartmentsData) {
    const id = await ctx.db.insert("apartments", {
      ...apt,
      status: "occupied",
      createdAt: now,
      updatedAt: now,
    });
    apartmentIds.push(id);
    console.log(`Created apartment: ${apt.unitLabel}`);
  }

  // Create tenants
  const tenantIds: string[] = [];
  for (let i = 0; i < apartmentIds.length; i++) {
    const id = await ctx.db.insert("tenants", {
      apartmentId: apartmentIds[i],
      name: tenantNames[i],
      phone: `555-${String(1000 + i).padStart(4, "0")}`,
      nationalId: `ID-${String(10000000 + i)}`,
      depositAmount: apartmentsData[i].rentAmount, // 1 month deposit
      leaseStartDate: leaseStart.getTime(),
      leaseEndDate: leaseEnd.getTime(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    tenantIds.push(id);
    console.log(`Created tenant: ${tenantNames[i]}`);
  }

  // Create payments for current month with varied statuses
  const paymentStatuses = ["paid", "paid", "paid", "paid", "paid", "paid", "pending", "late", "partial", "paid", "paid", "paid"];
  
  for (let i = 0; i < apartmentIds.length; i++) {
    const status = paymentStatuses[i] as "paid" | "pending" | "late" | "partial";
    const paymentDate = status === "paid" || status === "partial" ? now : 0;
    const amount = status === "partial" 
      ? Math.floor(apartmentsData[i].rentAmount * 0.5) 
      : apartmentsData[i].rentAmount;

    await ctx.db.insert("payments", {
      tenantId: tenantIds[i],
      apartmentId: apartmentIds[i],
      amount,
      dueDate: new Date(currentYear, currentMonth - 1, 5).getTime(),
      paymentDate,
      status,
      notes: status === "partial" ? "Partial payment received" : undefined,
      month: currentMonth,
      year: currentYear,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created payment for ${apartmentsData[i].unitLabel}: ${status}`);
  }

  // Create some maintenance records
  const maintenanceStatuses = ["done", "done", "pending", "in_progress", "done"] as const;
  
  for (let i = 0; i < maintenanceTitles.length; i++) {
    const maintenanceDate = new Date();
    maintenanceDate.setDate(maintenanceDate.getDate() - (i * 5));

    await ctx.db.insert("maintenance", {
      apartmentId: apartmentIds[i % apartmentIds.length],
      title: maintenanceTitles[i].title,
      cost: maintenanceTitles[i].cost,
      date: maintenanceDate.getTime(),
      status: maintenanceStatuses[i],
      description: `Routine maintenance - ${maintenanceTitles[i].title}`,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created maintenance: ${maintenanceTitles[i].title}`);
  }

  console.log("\n✅ Seed completed successfully!");
  console.log(`   - ${apartmentIds.length} apartments created`);
  console.log(`   - ${tenantIds.length} tenants created`);
  console.log(`   - ${paymentStatuses.length} payments created`);
  console.log(`   - ${maintenanceTitles.length} maintenance records created`);
}

// Export for Convex
export default seed;
export const seedDatabase = internalMutation({
  args: {},
  handler: seed,
});
