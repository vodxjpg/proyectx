// /home/zodx/Desktop/proyectx/app/dashboard/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/utils/db";
import { auth } from "@/utils/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 1) Verify session
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) {
    console.log("[DEBUG] Redirecting to /login: No session");
    redirect("/login");
  }
  const userId = session.user.id;

  // Log the userId in quotes and also its length to catch any trailing spaces
  console.log(
    `[DEBUG] DashboardLayout: User ID from session: "${userId}" (length=${userId.length})`
  );

  // 2) Check account with password
  const account = await db
    .selectFrom("account")
    .select(["id", "password", "providerId"])
    .where("userId", "=", userId)
    .where("providerId", "=", "credential")
    .executeTakeFirst();
  if (!account) {
    console.log("[DEBUG] Redirecting to /set-password: No account found for user:", userId);
    redirect("/set-password");
  }

  // 3) Load user
  const user = await db
    .selectFrom("user")
    .select(["id", "onboardingCompleted"])
    .where("id", "=", userId)
    .executeTakeFirstOrThrow();
  const userOnboardingCompleted = Number(user.onboardingCompleted);
  console.log("[DEBUG] DashboardLayout: User loaded:", {
    id: user.id,
    onboardingCompleted: userOnboardingCompleted,
  });

  // 4) Check organization membership
  //    IMPORTANT: we cast the returned count to a real number.
  const membershipCount = await db
    .selectFrom("member")
    .select(db.fn.count("id").as("count"))
    .where("userId", "=", userId)
    .executeTakeFirst()
    .then((res) => Number(res?.count ?? 0));

  console.log("[DEBUG] DashboardLayout: User membership count:", membershipCount);

  if (membershipCount > 0 && !session.session.activeOrganizationId) {
    console.log(
      "[DEBUG] Redirecting to /select-organization: User has memberships but no active org"
    );
    redirect("/select-organization");
  }

  // 5) Load tenant
  const allTenants = await db.selectFrom("tenant").selectAll().execute();
  console.log("[DEBUG] DashboardLayout: All tenants =>", JSON.stringify(allTenants, null, 2));

  const tenant = await db
    .selectFrom("tenant")
    .select(["id", "ownerUserId", "onboardingCompleted"])
    .where("ownerUserId", "=", userId)
    .executeTakeFirst();
  const tenantOnboardingCompleted = tenant ? Number(tenant.onboardingCompleted) : null;

  console.log("[DEBUG] DashboardLayout: Tenant query result:", tenant || "No tenant found");

  // 6) Handle access
  if (tenant && tenantOnboardingCompleted === 1) {
    // Tenant owner with completed onboarding
    if (!session.session.activeOrganizationId) {
      console.log("[DEBUG] Redirecting to /select-organization: Tenant owner has no active org");
      redirect("/select-organization");
    }
    return <>{children}</>;
  }

  if (!tenant && userOnboardingCompleted === 1) {
    // Non-owner with completed onboarding
    if (!session.session.activeOrganizationId) {
      console.log("[DEBUG] Redirecting to /select-organization: Non-owner, no active org");
      redirect("/select-organization");
    }
    return <>{children}</>;
  }

  // 7) Onboarding required or in progress
  if (tenant && tenantOnboardingCompleted === 0) {
    console.log("[DEBUG] Tenant exists but onboarding incomplete, redirecting to /onboarding/organization");
    redirect("/onboarding/organization");
  }

  console.log("[DEBUG] No tenant, no user onboarding, redirecting to /onboarding/organization");
  redirect("/onboarding/organization");
}
