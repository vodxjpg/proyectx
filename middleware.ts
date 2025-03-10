// /home/zodx/Desktop/proyectx/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * IMPORTANT:
 * - We no longer check membership or activeOrganizationId here.
 * - We ONLY verify that the user has a valid session if they attempt
 *   to access private routes.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("Middleware: requested pathname", pathname);

  // 1) Allow _next, static assets, and files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2) Define public routes
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/about-us",
    "/api/auth",
    "/api/auth/reset-password",
    "/admin/login",
    "/accept",             // For /accept/[invitationId]
    "/set-password",       // For new users to set their password
    "/accept-invitation",  // Covers /accept-invitation/[invitationId]
    "/accept-invite",      // Confirmation page
    "/api/check-user",     // API to check if user exists
    "/api/create-user",    // API to create users
    "/invite",             // Covers /invite/[invitationId]
    "/api/invite",
    "/check-email",
  ];

  // 3) Define allowed routes
  const allowedRoutes = [
    ...publicRoutes,
    "/onboarding/organization",
    "/onboarding/bot-keys",
    "/onboarding/support-email",
    "/onboarding/secret-phrase",
    "/settings",
    "/select-organization",
    // NOTE: Remove "/dashboard" from here:
    // "/dashboard"
  ];

  const isAllowed = allowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  console.log(`Middleware: Is ${pathname} allowed? ${isAllowed}`);
  if (isAllowed) {
    return NextResponse.next();
  }

  // 4) For internal API endpoints, check x-internal-token
  if (pathname.startsWith("/api/internal")) {
    const token = request.headers.get("x-internal-token");
    // IMPORTANT: must match NEXT_PUBLIC_INTERNAL_TOKEN
    if (token !== process.env.NEXT_PUBLIC_INTERNAL_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // 5) Admin route check (example)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sessionRes = await fetch(new URL("/api/auth/get-session", request.url), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });
    if (!sessionRes.ok) {
      console.log(`Middleware: Redirecting to /admin/login from ${pathname}`);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const sessionData = await sessionRes.json();
    if (
      !sessionData ||
      !sessionData.user ||
      (sessionData.user.role !== "admin" && sessionData.user.role !== "superAdmin")
    ) {
      console.log(`Middleware: Unauthorized admin access to ${pathname}`);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // 6) All other routes: must have a session cookie
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    console.log(`Middleware: No session cookie, redirecting to /login from ${pathname}`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 7) Validate the session
  const sessionRes = await fetch(new URL("/api/auth/get-session", request.url), {
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  });
  if (!sessionRes.ok) {
    console.log(`Middleware: Invalid session, redirecting to /login from ${pathname}`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 8) If session is valid, let user proceed
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*", // Apply middleware to all routes
};
