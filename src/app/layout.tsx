import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { PWA } from "@/components/pwa";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "InvoiceFlow", template: "%s · InvoiceFlow" },
  description: "Simple GST invoicing — online & offline PWA",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "InvoiceFlow" },
};
export const viewport: Viewport = { themeColor: "#2563EB", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PWA />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
