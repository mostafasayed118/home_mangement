import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers";
import { cookies } from "next/headers";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "لوحة تحكم إدارة المباني",
  description: "إدارة مبناك السكني بسهولة",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value || null;

  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <body className={cairo.className}>
        <ConvexClientProvider initialToken={token}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
