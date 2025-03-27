// /home/zodx/Desktop/proyectx/app/api/onboarding/selling-countries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/utils/db";
import { auth } from "@/utils/auth";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 1) Verify the user is logged in
    const session = await auth.api.getSession({ headers: headers() });
    if (!session?.user) {
      console.log("[DEBUG] Selling Countries: No session found");
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // 2) Parse the request body
    const body = await request.json();
    const { organizationId, countries } = body as { organizationId: string; countries: string[] };
    if (!organizationId || !Array.isArray(countries) || countries.some(code => typeof code !== "string" || code.length !== 2)) {
      console.log("[DEBUG] Selling Countries: Invalid input", { organizationId, countries });
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 3) Verify user membership in the organization
    const membership = await db
      .selectFrom("member")
      .select("id")
      .where("organizationId", "=", organizationId)
      .where("userId", "=", session.user.id)
      .executeTakeFirst();
    if (!membership) {
      console.log("[DEBUG] Selling Countries: User not a member of organization", organizationId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 4) Prepare data for insertion
    const now = new Date().toISOString();
    const values = countries.map(countryCode => ({
      id: randomUUID(),
      organizationId,
      countryCode: countryCode.toUpperCase(),
      logistics_group: null,
      support_group: null,
      createdAt: now,
      updatedAt: now,
    }));

    // 5) Insert countries into the database
    await db.insertInto("organization_countries").values(values).execute();
    console.log("[DEBUG] Selling Countries: Countries saved for org:", organizationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DEBUG] Selling Countries error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}