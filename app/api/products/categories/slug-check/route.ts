import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";

export async function GET(req: NextRequest) {
  try {
    // Get slug and optional excludeId from query params
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const excludeId = searchParams.get("excludeId");

    if (!slug) {
      console.log("No slug provided for checking.");
      return NextResponse.json({ error: "Slug parameter is required" }, { status: 400 });
    }

    // Get the active organization from the session
    const sessionResponse = await auth.api.getSession({ headers: req.headers });
    if (!sessionResponse || !sessionResponse.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = sessionResponse.session.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Check if the slug exists in the organization, excluding the current category if editing
    console.log(`Checking slug "${slug}" for organization ${organizationId}...`);
    let query = db
      .selectFrom("product_categories")
      .select(["id"])
      .where("organizationId", "=", organizationId)
      .where("slug", "=", slug);

    if (excludeId) {
      query = query.where("id", "!=", excludeId);
    }

    const existingCategory = await query.executeTakeFirst();

    if (existingCategory) {
      console.log(`Slug "${slug}" is already taken with ID: ${existingCategory.id}`);
      return NextResponse.json({ exists: true });
    } else {
      console.log(`Slug "${slug}" is available`);
      return NextResponse.json({ exists: false });
    }
  } catch (error: any) {
    console.error("Error checking slug availability:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}