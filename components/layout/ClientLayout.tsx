"use client"; // ✅ This makes it a Client Component

import { usePathname } from "next/navigation";
import LandingHeader from "@/components/layout/LandingHeader";
import Footer from "@/components/layout/Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // List of pages where the header/footer should be hidden
  const hiddenPages = ["/login", "/signup", "/forgot-password", "/reset-password"];

  const hideLayout = hiddenPages.includes(pathname); // Check if pathname is in the list

  return (
    <>
      {!hideLayout && <LandingHeader />}
      <main className="flex-grow">{children}</main>
      {!hideLayout && <Footer />}
    </>
  );
}
