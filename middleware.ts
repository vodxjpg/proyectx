import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("Middleware: requested pathname", pathname);

  // 1) Allow _next, static assets, and direct file requests (images, .css, etc.)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2) Define public routes (no session required)
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
    "/accept",
    "/set-password",
    "/accept-invitation",
    "/accept-invite",
    "/api/user",
    "/api/user/check",
    "/invite",
    "/api/invite",
    "/check-email",
  ];

  // 3) Define allowed routes (completely open – no session checks)
  //    or partial sub-routes 
  const allowedRoutes = [
    ...publicRoutes,
    "/onboarding/organization",
    "/onboarding/bot-keys",
    "/onboarding/selling-countries",
    "/onboarding/support-email",
    "/onboarding/secret-phrase",
    "/select-organization",
  ];

  // 4) Check if route is in allowedRoutes
  const isAllowed = allowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  console.log(`Middleware: Is ${pathname} allowed? ${isAllowed}`);

  // If the route is "allowed" outright (public or one of the array entries), skip all checks.
  if (isAllowed) {
    return NextResponse.next();
  }

  // -------------------------------------------
  // 4.5) Check if it's an /api/products or /api/organization route.
  //      We want to require an authenticated session for these,
  //      but not block them if the user is logged in.
  // -------------------------------------------
  if (
    pathname.startsWith("/api/products") ||
    pathname.startsWith("/api/organization")
  ) {
    // Let's do a session check:
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      console.log(`Middleware: No session cookie, returning 401 for ${pathname}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate the session
    const sessionRes = await fetch(new URL("/api/auth/get-session", request.url), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });
    if (!sessionRes.ok) {
      console.log(`Middleware: Invalid session, returning 401 for ${pathname}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Session is valid => proceed
    return NextResponse.next();
  }

  // 5) For internal API endpoints, check x-internal-token OR valid session
  if (pathname.startsWith("/api/internal")) {
    const token = request.headers.get("x-internal-token");
    if (token === process.env.NEXT_PUBLIC_INTERNAL_TOKEN) {
      return NextResponse.next();
    }

    // Check for a valid session
    const sessionCookie = getSessionCookie(request);
    if (sessionCookie) {
      const sessionRes = await fetch(new URL("/api/auth/get-session", request.url), {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      });
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        console.log("DEBUG: sessionData.user =", sessionData.user);
        if (sessionData && sessionData.user) {
          return NextResponse.next();
        }
      }
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 6) Admin route check
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

  // 7) All other routes: must have a session cookie
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    console.log(`Middleware: No session cookie, redirecting to /login from ${pathname}`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 8) Validate the session
  const sessionRes = await fetch(new URL("/api/auth/get-session", request.url), {
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  });
  if (!sessionRes.ok) {
    console.log(`Middleware: Invalid session, redirecting to /login from ${pathname}`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 9) Session data is valid at this point
  const sessionData = await sessionRes.json();
  if (!sessionData || !sessionData.user) {
    console.log("Middleware: No user data in session, redirecting to /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 10) Ensure user has an active (selected) organization
  if (!sessionData.session.activeOrganizationId) {
    console.log("Middleware: User has no selected organization, redirecting to /select-organization");

    // If they're not already on /select-organization or an /onboarding route, redirect them
    const isOnSelectOrOnboarding =
      pathname.startsWith("/select-organization") || pathname.startsWith("/onboarding");
    if (!isOnSelectOrOnboarding) {
      return NextResponse.redirect(new URL("/select-organization", request.url));
    }
  }

  // 11) Everything else passes
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*", // Apply middleware to all routes
};
