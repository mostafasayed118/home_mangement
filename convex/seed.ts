import { internalMutation } from "./_generated/server";

/**
 * Seed the database with sample data
 * Run with: pnpm convex run seed
 */
export const seed = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

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
    }

    // Create tenants - properly typed as any to avoid TypeScript issues with Convex Id types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenantIds: any[] = [];
    for (let i = 0; i < apartmentIds.length; i++) {
      const id = await ctx.db.insert("tenants", {
        apartmentId: apartmentIds[i] as any,
        name: tenantNames[i],
        phone: `555-${String(1000 + i).padStart(4, "0")}`,
        nationalId: `ID-${String(10000000 + i)}`,
        depositAmount: apartmentsData[i].rentAmount,
        leaseStartDate: leaseStart.getTime(),
        leaseEndDate: leaseEnd.getTime(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      tenantIds.push(id);
    }

    // Create payments for current month with varied statuses
    const paymentStatuses = ["paid", "paid", "paid", "paid", "paid", "paid", "pending", "late", "partial", "paid", "paid", "paid"] as const;

    for (let i = 0; i < apartmentIds.length; i++) {
      const status = paymentStatuses[i];
      const paymentDate = status === "paid" || status === "partial" ? now : 0;
      const amount = status === "partial"
        ? Math.floor(apartmentsData[i].rentAmount * 0.5)
        : apartmentsData[i].rentAmount;

      await ctx.db.insert("payments", {
        tenantId: tenantIds[i],
        apartmentId: apartmentIds[i] as any,
        amount,
        dueDate: new Date(currentYear, currentMonth - 1, 5).getTime(),
        paymentDate,
        status,
        month: currentMonth,
        year: currentYear,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create maintenance records
    const maintenanceData = [
      { title: "Plumbing repair - bathroom", cost: 150, status: "done" as const },
      { title: "AC filter replacement", cost: 75, status: "done" as const },
      { title: "Electrical outlet fix", cost: 100, status: "pending" as const },
      { title: "Lock replacement", cost: 80, status: "in_progress" as const },
      { title: "Window seal repair", cost: 120, status: "done" as const },
    ];

    for (let i = 0; i < maintenanceData.length; i++) {
      const m = maintenanceData[i];
      const maintenanceDate = new Date();
      maintenanceDate.setDate(maintenanceDate.getDate() - (i * 5));

      await ctx.db.insert("maintenance", {
        apartmentId: apartmentIds[i % apartmentIds.length] as any,
        title: m.title,
        cost: m.cost,
        date: maintenanceDate.getTime(),
        status: m.status,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      apartments: apartmentIds.length,
      tenants: tenantIds.length,
      payments: paymentStatuses.length,
      maintenance: maintenanceData.length,
    };
  },
});
