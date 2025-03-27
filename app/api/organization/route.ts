// /app/api/organization/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/utils/db";
import { auth } from "@/utils/auth";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 1) Check session
    const session = await auth.api.getSession({ headers: headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // 2) Parse body
    const body = await request.json();
    const { name, slug, supportEmail, countries } = body as {
      name?: string;
      slug?: string;
      supportEmail?: string;
      countries?: string[];
    };

    // Validate minimal fields
    if (!name || !slug) {
      return NextResponse.json({ error: "Missing name or slug" }, { status: 400 });
    }

    // 3) Create the organization
    const orgId = randomUUID();
    const now = new Date().toISOString();

    await db
      .insertInto("organization")
      .values({
        id: orgId,
        name,
        slug,
        logo: null,
        createdAt: now,
        metadata: null,
      })
      .execute();

    // 4) Add membership so current user is admin
    await db
      .insertInto("member")
      .values({
        id: randomUUID(),
        organizationId: orgId,
        userId: session.user.id,
        role: "admin",
        createdAt: now,
      })
      .execute();

    // 5) Insert support email (if provided)
    if (supportEmail) {
      await db
        .insertInto("organization_support_email")
        .values({
          id: randomUUID(),
          organizationId: orgId,
          userId: session.user.id,
          encryptedSupportEmail: supportEmail, // storing plain text
          createdAt: now,
          updatedAt: now,
        })
        .execute();
    }

    // 6) Insert countries
    if (Array.isArray(countries) && countries.length > 0) {
      const countryInserts = countries.map((code) => ({
        id: randomUUID(),
        organizationId: orgId,
        countryCode: code.toUpperCase(),
        logistics_group: null,
        support_group: null,
        createdAt: now,
        updatedAt: now,
      }));

      await db
        .insertInto("organization_countries")
        .values(countryInserts)
        .execute();
    }

    // Done
    return NextResponse.json({ success: true, organizationId: orgId });
  } catch (error: any) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
