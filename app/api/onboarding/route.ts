// /home/zodx/Desktop/proyectx/app/api/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/utils/db";
import { encryptData } from "@/utils/encryption";
import { auth } from "@/utils/auth";
import { randomUUID } from "crypto";

const ENC_KEY = process.env.DATA_ENCRYPTION_KEY || "";

export async function POST(request: NextRequest) {
  try {
    // 1) Identify logged-in user
    const session = await auth.api.getSession({ headers: headers() });
    if (!session?.user) {
      console.log("[DEBUG] Onboarding: No session found");
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    const userId = session.user.id;
    console.log("[DEBUG] Onboarding: User ID:", userId);

    // 2) Get the JSON body
    const body = await request.json();
    const {
      supportEmail,
      organizationId,
      secretPhrase,
      platforms,
    } = body as {
      supportEmail?: string;
      organizationId?: string;
      secretPhrase?: string;
      platforms?: Array<{
        platformName: string;
        apiKey: string;
        organizationId: string;
      }>;
    };

    // 3) Find the tenant record by userId
    const tenant = await db
      .selectFrom("tenant")
      .selectAll()
      .where("ownerUserId", "=", userId)
      .executeTakeFirst();

    if (!tenant) {
      console.log("[DEBUG] Onboarding: Tenant not found for user:", userId);
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    console.log("[DEBUG] Onboarding: Found tenant:", tenant.id);

    const now = new Date().toISOString();
    const updateTenant: Record<string, any> = { updatedAt: now };

    // 4) Handle support email
    if (supportEmail && organizationId) {
      const encryptedEmail = encryptData(supportEmail, ENC_KEY);
      await db
        .insertInto("organization_support_email")
        .values({
          id: randomUUID(),
          organizationId,
          userId,
          encryptedSupportEmail: encryptedEmail,
          createdAt: now,
          updatedAt: now,
        })
        .execute();
      console.log("[DEBUG] Onboarding: Support email added for org:", organizationId);
    }

    // 5) Handle secret phrase
    if (secretPhrase) {
      updateTenant.encryptedSecretPhrase = encryptData(secretPhrase, ENC_KEY);
      console.log("[DEBUG] Onboarding: Secret phrase set for tenant:", tenant.id);
    }

    // 6) Handle platform keys
    if (Array.isArray(platforms) && platforms.length > 0) {
      for (const { platformName, apiKey, organizationId: orgId } of platforms) {
        if (!platformName || !apiKey || !orgId) {
          console.log("[DEBUG] Onboarding: Skipped invalid platform entry:", {
            platformName,
            apiKey,
            orgId,
          });
          continue;
        }

        const existingPlatform = await db
          .selectFrom("tenant_platforms")
          .selectAll()
          .where("tenantId", "=", tenant.id)
          .where("organizationId", "=", orgId)
          .where("platformName", "=", platformName)
          .executeTakeFirst();

        const encryptedApiKey = encryptData(apiKey, ENC_KEY);

        if (existingPlatform) {
          // Update existing record
          await db
            .updateTable("tenant_platforms")
            .set({ encryptedApiKey, updatedAt: now })
            .where("id", "=", existingPlatform.id)
            .execute();
          console.log("[DEBUG] Onboarding: Updated platform:", platformName, "for tenant:", tenant.id);
        } else {
          // Insert new record
          await db
            .insertInto("tenant_platforms")
            .values({
              tenantId: tenant.id,
              organizationId: orgId,
              platformName,
              encryptedApiKey,
              createdAt: now,
              updatedAt: now,
            })
            .execute();
          console.log("[DEBUG] Onboarding: Added platform:", platformName, "for tenant:", tenant.id);
        }
      }
    }

    // 7) Update tenant record with any changes (secret phrase, updatedAt, etc.)
    await db
      .updateTable("tenant")
      .set(updateTenant)
      .where("id", "=", tenant.id)
      .execute();
    console.log("[DEBUG] Onboarding: Tenant updated:", tenant.id);

    // 8) Check if we have everything for full onboarding
    const updatedTenant = await db
      .selectFrom("tenant")
      .select(["id", "encryptedSecretPhrase", "onboardingCompleted"])
      .where("id", "=", tenant.id)
      .executeTakeFirstOrThrow();

    const platformsCount = await db
      .selectFrom("tenant_platforms")
      .select(db.fn.countAll<number>().as("count"))
      .where("tenantId", "=", tenant.id)
      .executeTakeFirstOrThrow();

    const hasAtLeastOnePlatform = platformsCount.count > 0;
    const hasSecretPhrase = Boolean(updatedTenant.encryptedSecretPhrase);

    const supportEmailCount = await db
      .selectFrom("organization_support_email")
      .select(db.fn.countAll<number>().as("count"))
      .where("userId", "=", userId)
      .executeTakeFirstOrThrow();

    const hasSupportEmail = supportEmailCount.count > 0;

    console.log("[DEBUG] Onboarding Check:", {
      tenantId: updatedTenant.id,
      hasAtLeastOnePlatform,
      hasSupportEmail,
      hasSecretPhrase,
      currentOnboardingCompleted: updatedTenant.onboardingCompleted,
    });

    // 9) If not already marked completed, and all conditions are met => set onboardingCompleted=1
    if (
      !updatedTenant.onboardingCompleted &&
      hasAtLeastOnePlatform &&
      hasSupportEmail &&
      hasSecretPhrase
    ) {
      console.log("[DEBUG] Onboarding: Marking tenant as completed:", updatedTenant.id);
      await db
        .updateTable("tenant")
        .set({ onboardingCompleted: 1, updatedAt: now })
        .where("id", "=", tenant.id)
        .execute();
      console.log("[DEBUG] Onboarding: Tenant onboarding completed:", tenant.id);
    } else {
      console.log("[DEBUG] Onboarding: Conditions not met or already completed. Doing nothing.");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DEBUG] Onboarding error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
