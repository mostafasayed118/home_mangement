import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers";

const cairo = Cairo({ 
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "لوحة تحكم إدارة المباني",
  description: "إدارة مبناك السكني بسهولة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <body className={cairo.className}>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
