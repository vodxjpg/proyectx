import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";

/**
 * Helper to retrieve the active org ID or throw.
 */
async function getOrgIdOrThrow(req: NextRequest) {
  const sessionResponse = await auth.api.getSession({ headers: req.headers });
  if (!sessionResponse || !sessionResponse.session) {
    throw new Error("Unauthorized");
  }
  const activeOrgId = sessionResponse.session.activeOrganizationId;
  if (!activeOrgId) throw new Error("No active organization in session");
  return activeOrgId;
}

/**
 * GET: list all product attributes for the active org
 */
export async function GET(req: NextRequest) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const attributes = await db
      .selectFrom("product_attributes")
      .selectAll()
      .where("organizationId", "=", organizationId)
      .orderBy("name", "asc")
      .execute();
    return NextResponse.json(attributes);
  } catch (error: any) {
    const isUnauthorized = error.message === "Unauthorized";
    return NextResponse.json(
      { error: error.message },
      { status: isUnauthorized ? 401 : 400 },
    );
  }
}

/**
 * POST: create a new product attribute
 */
export async function POST(req: NextRequest) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await db
      .selectFrom("product_attributes")
      .select("id")
      .where("organizationId", "=", organizationId)
      .where("slug", "=", slug)
      .executeTakeFirst();

    if (existing) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const attribute = await db
      .insertInto("product_attributes")
      .values({ id, name, slug, organizationId })
      .returningAll()
      .executeTakeFirstOrThrow();

    return NextResponse.json(attribute, { status: 201 });
  } catch (error: any) {
    const isUnauthorized = error.message === "Unauthorized";
    return NextResponse.json(
      { error: error.message },
      { status: isUnauthorized ? 401 : 400 },
    );
  }
}

/**
 * PUT: update an existing product attribute
 */
export async function PUT(req: NextRequest) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const { id, name, slug } = await req.json();

    if (!id || !name || !slug) {
      return NextResponse.json({ error: "ID, name, and slug are required" }, { status: 400 });
    }

    // Check if slug already exists on another attribute
    const existing = await db
      .selectFrom("product_attributes")
      .select("id")
      .where("organizationId", "=", organizationId)
      .where("slug", "=", slug)
      .where("id", "!=", id)
      .executeTakeFirst();

    if (existing) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    const attribute = await db
      .updateTable("product_attributes")
      .set({ name, slug })
      .where("id", "=", id)
      .where("organizationId", "=", organizationId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return NextResponse.json(attribute);
  } catch (error: any) {
    const isUnauthorized = error.message === "Unauthorized";
    return NextResponse.json(
      { error: error.message },
      { status: isUnauthorized ? 401 : 400 },
    );
  }
}

/**
 * DELETE: remove an attribute (and its terms) from the DB
 */
export async function DELETE(req: NextRequest) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // First delete any terms referencing this attribute to avoid FK constraint errors
    // (If your schema has ON DELETE CASCADE, you could skip this manual step)
    await db
      .deleteFrom("product_attribute_terms")
      .where("attributeId", "=", id)
      .execute();

    // Now delete the attribute itself
    await db
      .deleteFrom("product_attributes")
      .where("id", "=", id)
      .where("organizationId", "=", organizationId)
      .execute();

    return NextResponse.json({ message: "Attribute deleted" });
  } catch (error: any) {
    const isUnauthorized = error.message === "Unauthorized";
    return NextResponse.json(
      { error: error.message },
      { status: isUnauthorized ? 401 : 400 },
    );
  }
}
