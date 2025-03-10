// app/api/create-tenant/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { db } from "@/utils/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    const userId = session.user.id;

    const existingTenant = await db
      .selectFrom("tenant")
      .where("ownerUserId", "=", userId)
      .selectAll()
      .executeTakeFirst();

    if (existingTenant) {
      console.log("Tenant already exists:", existingTenant.id);
      return NextResponse.json({ message: "Tenant already exists", tenantId: existingTenant.id });
    }

    const now = new Date().toISOString();
    const result = await db
      .insertInto("tenant")
      .values({
        ownerUserId: userId,
        name: session.user.name ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning("id") // Get the auto-incremented ID
      .executeTakeFirstOrThrow();

    const tenantId = result.id;
    console.log("Created tenant:", { tenantId, ownerUserId: userId });

    return NextResponse.json({ message: "Tenant created successfully!", tenantId });
  } catch (error: any) {
    console.error("create-tenant error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}