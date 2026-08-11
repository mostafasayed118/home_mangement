import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Convex Cron Jobs Configuration
 * 
 * This file defines scheduled jobs that run automatically.
 * 
 * To enable cron jobs:
 * 1. Run `npx convex dev` to start the Convex development server
 * 2. The cron jobs will be automatically registered and run on schedule
 * 
 * Note: In development, cron jobs run at the scheduled time.
 * In production, Convex handles the scheduling automatically.
 */

const crons = cronJobs();

// Run on the 1st of every month at 00:00 UTC (which is midnight)
// This generates invoices for all active tenants
crons.monthly(
  "generate-monthly-invoices",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.invoices.generateMonthlyInvoices,
);

// Schedule: Check for late payments every day at 10:00 AM
// Using interval() to run every 24 hours (in milliseconds)
// The job will run at approximately 10:00 AM server time
crons.interval(
  "check-late-payments",
  { seconds: 24 * 60 * 60 }, // 24 hours in seconds
  internal.payments.checkAndMarkLatePayments
);

export default crons;
