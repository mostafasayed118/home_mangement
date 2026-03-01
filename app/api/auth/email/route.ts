import { NextRequest, NextResponse } from "next/server";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, token, name, amount, dueDate } = body;

    let result;

    if (type === "verification") {
      result = await sendVerificationEmail(email, token);
    } else if (type === "password-reset") {
      result = await sendPasswordResetEmail(email, token);
    } else if (type === "welcome") {
      result = await sendWelcomeEmail(email, name);
    } else if (type === "payment-reminder") {
      // For payment reminders, we'll use a placeholder - you can customize this
      // The convex/emails.ts handles its own logic
      result = { success: true };
    } else {
      return NextResponse.json(
        { error: "Invalid email type" },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
