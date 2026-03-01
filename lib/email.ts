import nodemailer from "nodemailer";

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM_EMAIL = process.env.GMAIL_USER || "your-email@gmail.com";

interface EmailResult {
  success: boolean;
  error?: string;
}

// Send verification email
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "تأكيد البريد الإلكتروني - لوحة تحكم إدارة المباني",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>تأكيد البريد الإلكتروني</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f3f4f6;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #1f2937;
              margin: 0;
              font-size: 24px;
            }
            .content {
              text-align: right;
              color: #4b5563;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              background-color: #3b82f6;
              color: #ffffff;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 14px;
            }
            .link-text {
              word-break: break-all;
              color: #6b7280;
              font-size: 12px;
              background: #f3f4f6;
              padding: 10px;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مرحباً بك في لوحة تحكم إدارة المباني</h1>
            </div>
            <div class="content">
              <p>شكراً لتسجيلك معنا! يرجى تأكيد بريدك الإلكتروني بالنقر على الزر أدناه:</p>
              <p style="text-align: center;">
                <a href="${verifyUrl}" class="button">تأكيد البريد الإلكتروني</a>
              </p>
              <p>أو يمكنك نسخ الرابط التالي في متصفحك:</p>
              <p class="link-text">${verifyUrl}</p>
              <p>سينتهي صلاحية هذا الرابط خلال 24 ساعة.</p>
              <p>إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد الإلكتروني.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} لوحة تحكم إدارة المباني. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "إعادة تعيين كلمة المرور - لوحة تحكم إدارة المباني",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>إعادة تعيين كلمة المرور</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f3f4f6;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #1f2937;
              margin: 0;
              font-size: 24px;
            }
            .content {
              text-align: right;
              color: #4b5563;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              background-color: #ef4444;
              color: #ffffff;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 14px;
            }
            .link-text {
              word-break: break-all;
              color: #6b7280;
              font-size: 12px;
              background: #f3f4f6;
              padding: 10px;
              border-radius: 4px;
            }
            .warning {
              background-color: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 6px;
              padding: 12px;
              margin: 20px 0;
              color: #991b1b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>إعادة تعيين كلمة المرور</h1>
            </div>
            <div class="content">
              <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. انقر على الزر أدناه لإنشاء كلمة مرور جديدة:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور</a>
              </p>
              <p>أو يمكنك نسخ الرابط التالي في متصفحك:</p>
              <p class="link-text">${resetUrl}</p>
              <div class="warning">
                <p><strong>تنبيه:</strong> سينتهي صلاحية هذا الرابط خلال ساعة واحدة فقط.</p>
              </div>
              <p>إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} لوحة تحكم إدارة المباني. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// Send welcome email after verification
export async function sendWelcomeEmail(email: string, name?: string): Promise<EmailResult> {
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "مرحباً بك - لوحة تحكم إدارة المباني",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>مرحباً بك</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f3f4f6;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #1f2937;
              margin: 0;
              font-size: 24px;
            }
            .content {
              text-align: right;
              color: #4b5563;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              background-color: #10b981;
              color: #ffffff;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مرحباً بك! 🎉</h1>
            </div>
            <div class="content">
              <p>مرحباً ${name || "عزيزي المستخدم"}،</p>
              <p>تم تأكيد بريدك الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول والبدء في استخدام لوحة تحكم إدارة المباني.</p>
              <p style="text-align: center;">
                <a href="${APP_URL}/sign-in" class="button">تسجيل الدخول</a>
              </p>
              <p>نتمنى لك تجربة ممتعة!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} لوحة تحكم إدارة المباني. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error: "Failed to send email" };
  }
}
