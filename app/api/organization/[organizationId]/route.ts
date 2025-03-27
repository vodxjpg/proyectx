// /app/api/organization/[organizationId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/utils/db";
import { auth } from "@/utils/auth";
import { randomUUID } from "crypto";
import { encryptData, decryptData } from "@/utils/encryption"; // import your real encryption fns

const ENC_KEY = process.env.DATA_ENCRYPTION_KEY || "";

interface BodyType {
  name?: string;
  slug?: string;
  supportEmail?: string;
  countries?: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params;
    if (!organizationId) {
      return NextResponse.json({ error: "Missing organization ID" }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Check membership
    const membership = await db
      .selectFrom("member")
      .select("id")
      .where("organizationId", "=", organizationId)
      .where("userId", "=", session.user.id)
      .executeTakeFirst();
    if (!membership) {
      return NextResponse.json({ error: "User not a member of org" }, { status: 403 });
    }

    // Fetch org
    const orgRow = await db
      .selectFrom("organization")
      .select(["id", "name", "slug"])
      .where("id", "=", organizationId)
      .executeTakeFirst();
    if (!orgRow) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Fetch support email
    const supportRow = await db
      .selectFrom("organization_support_email")
      .select(["encryptedSupportEmail"])
      .where("organizationId", "=", organizationId)
      .executeTakeFirst();

    let decryptedEmail = "";
    if (supportRow?.encryptedSupportEmail) {
      decryptedEmail = decryptData(supportRow.encryptedSupportEmail, ENC_KEY);
    }

    // Fetch countries
    const countryRows = await db
      .selectFrom("organization_countries")
      .select(["countryCode"])
      .where("organizationId", "=", organizationId)
      .execute();
    const countries = countryRows.map((row) => row.countryCode);

    return NextResponse.json({
      id: orgRow.id,
      name: orgRow.name,
      slug: orgRow.slug,
      supportEmail: decryptedEmail,
      countries,
    });
  } catch (error: any) {
    console.error("Error fetching organization data:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params;
    if (!organizationId) {
      return NextResponse.json({ error: "Missing organization ID" }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const body = (await request.json()) as BodyType;
    const { name, slug, supportEmail, countries } = body;

    // Check membership
    const membership = await db
      .selectFrom("member")
      .select("id")
      .where("organizationId", "=", organizationId)
      .where("userId", "=", session.user.id)
      .executeTakeFirst();
    if (!membership) {
      return NextResponse.json({ error: "User not a member of org" }, { status: 403 });
    }

    // Update org table
    const updates: Record<string, any> = {};
    if (name) updates.name = name;
    if (slug) updates.slug = slug;
    if (Object.keys(updates).length > 0) {
      await db
        .updateTable("organization")
        .set(updates)
        .where("id", "=", organizationId)
        .execute();
    }

    // Upsert support email
    const now = new Date().toISOString();
    if (supportEmail) {
      const encrypted = encryptData(supportEmail, ENC_KEY);

      const existingRow = await db
        .selectFrom("organization_support_email")
        .selectAll()
        .where("organizationId", "=", organizationId)
        .executeTakeFirst();

      if (!existingRow) {
        await db
          .insertInto("organization_support_email")
          .values({
            id: randomUUID(),
            organizationId,
            userId: session.user.id,
            encryptedSupportEmail: encrypted,
            createdAt: now,
            updatedAt: now,
          })
          .execute();
      } else {
        await db
          .updateTable("organization_support_email")
          .set({
            encryptedSupportEmail: encrypted,
            updatedAt: now,
          })
          .where("organizationId", "=", organizationId)
          .execute();
      }
    }

    // Overwrite countries
    if (Array.isArray(countries)) {
      await db
        .deleteFrom("organization_countries")
        .where("organizationId", "=", organizationId)
        .execute();

      if (countries.length > 0) {
        const inserts = countries.map((code) => ({
          id: randomUUID(),
          organizationId,
          countryCode: code.toUpperCase(),
          logistics_group: null,
          support_group: null,
          createdAt: now,
          updatedAt: now,
        }));
        await db
          .insertInto("organization_countries")
          .values(inserts)
          .execute();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
