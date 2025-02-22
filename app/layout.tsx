import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css"; // ✅ This applies styles globally
import { ReactNode } from "react";
import ClientLayout from "@/components/layout/ClientLayout"; // ✅ Import client wrapper

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
