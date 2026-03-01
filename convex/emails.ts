import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send a welcome email to a new tenant
 * Note: This action calls the Next.js API route which handles email sending via Nodemailer
 * This is because nodemailer doesn't work directly in Convex Edge runtime
 */
export const sendWelcomeEmail = action({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { email, name } = args;

      // Call the Next.js API route to send the email
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'welcome',
          email,
          name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Welcome email sent successfully:", result);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      
      // Return error details but don't throw to prevent breaking the tenant creation flow
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Send a rent payment reminder email
 * Note: This action calls the Next.js API route which handles email sending via Nodemailer
 */
export const sendPaymentReminder = action({
  args: {
    email: v.string(),
    name: v.string(),
    amount: v.number(),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { email, name, amount, dueDate } = args;

      // Call the Next.js API route to send the email
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'payment-reminder',
          email,
          name,
          amount,
          dueDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Payment reminder email sent successfully:", result);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Failed to send payment reminder email:", error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
