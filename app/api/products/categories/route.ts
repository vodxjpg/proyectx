import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";

// Helper: Get organizationId from query or active session
async function getOrgIdOrThrow(req: NextRequest) {
  console.log("Getting organization ID...");
  const sessionResponse = await auth.api.getSession({ headers: req.headers });
  if (!sessionResponse || !sessionResponse.session) {
    throw new Error("Unauthorized");
  }

  const { searchParams } = new URL(req.url);
  const orgIdParam = searchParams.get("orgId");
  const orgSlugParam = searchParams.get("orgSlug");

  if (orgIdParam) {
    console.log("Using orgId from query:", orgIdParam);
    return orgIdParam;
  }

  if (orgSlugParam) {
    console.log("Looking up org by slug:", orgSlugParam);
    const orgRecord = await db
      .selectFrom("organization")
      .select(["id", "slug"])
      .where("slug", "=", orgSlugParam)
      .executeTakeFirst();
    if (!orgRecord) {
      throw new Error("Invalid organization slug");
    }
    console.log("Found org ID by slug:", orgRecord.id);
    return orgRecord.id;
  }

  const activeOrgId = sessionResponse.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error("No active organization in session");
  }
  console.log("Using active org ID from session:", activeOrgId);
  return activeOrgId;
}

export async function GET(req: NextRequest) {
  console.log("GET /api/product-categories called");
  try {
    const organizationId = await getOrgIdOrThrow(req);
    console.log("Fetching categories for organization:", organizationId);

    const categories = await db
      .selectFrom("product_categories")
      .selectAll()
      .where("organizationId", "=", organizationId)
      .orderBy("name", "asc")
      .execute();

    console.log("Categories fetched:", categories);
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("GET error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  console.log("POST /api/product-categories called");
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const body = await req.json();
    console.log("Received payload:", body);
    const { name, image, slug, parentId } = body;

    if (!name || !slug) {
      console.log("Missing required fields: name or slug");
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check for existing slug
    const existing = await db
      .selectFrom("product_categories")
      .select("id")
      .where("organizationId", "=", organizationId)
      .where("slug", "=", slug)
      .executeTakeFirst();

    if (existing) {
      console.log("Slug already exists:", slug);
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    console.log("Creating category with ID:", id);
    const category = await db
      .insertInto("product_categories")
      .values({
        id,
        name,
        image,
        slug,
        organizationId,
        parentId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    console.log("Category created:", category);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("POST error:", error.message);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}