"use client"; // ✅ This makes it a Client Component

import { usePathname } from "next/navigation";
import HeaderDesktop from "@/components/layout/HeaderDesktop";            // Desktop header
import HeaderMobile from "@/components/layout/HeaderMobile"; // New mobile header
import LandingHeader from "@/components/layout/LandingHeader";
import Footer from "@/components/layout/Footer";


export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // List of pages where the header/footer should be hidden
  const hiddenPages = ["/login", "/signup", "/forgot-password", "/reset-password", "/admin/login", "/accept-invitation", "/accept-invite", "/check-email"];

  // Check if pathname is in the list of hidden pages
  const hideLayout = hiddenPages.includes(pathname);

  // Landing page check (adjust if your landing page route differs)
  const isLandingPage = pathname === "/";

  return (
    <>
      {/* Show header unless on a hidden page */}
      {!hideLayout && (
        isLandingPage ? (
          // Landing page => LandingHeader
          <LandingHeader />
        ) : (
          // Non-landing page => Desktop or Mobile header
          <>
            {/* Desktop header (shown at md breakpoint & above) */}
            <div className="hidden md:block">
              <HeaderDesktop />
            </div>
            {/* Mobile header (shown below md breakpoint) */}
            <div className="block md:hidden">
              <HeaderMobile />
            </div>
          </>
        )
      )}

      <main className="flex-grow py-16">
        {children}
      </main>

      {/* Show footer unless on a hidden page */}
      {!hideLayout && <Footer />}
    </>
  );
}
