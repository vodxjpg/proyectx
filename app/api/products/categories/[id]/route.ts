import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";

// Helper to get org
async function getOrgIdOrThrow(req: NextRequest) {
  const sessionResponse = await auth.api.getSession({ headers: req.headers });
  if (!sessionResponse || !sessionResponse.session) {
    throw new Error("Unauthorized");
  }
  const { searchParams } = new URL(req.url);
  const orgIdParam = searchParams.get("orgId");
  const orgSlugParam = searchParams.get("orgSlug");

  if (orgIdParam) return orgIdParam;
  if (orgSlugParam) {
    const orgRecord = await db
      .selectFrom("organization")
      .selectAll()
      .where("slug", "=", orgSlugParam)
      .executeTakeFirst();
    if (!orgRecord) {
      throw new Error("Invalid organization slug");
    }
    return orgRecord.id;
  }

  const activeOrgId = sessionResponse.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new Error("No active organization in session");
  }
  return activeOrgId;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const { id } = params;
    const body = await req.json();
    const { name, image, slug, parentId } = body;

    // Check if category exists
    const category = await db
      .selectFrom("product_categories")
      .selectAll()
      .where("id", "=", id)
      .where("organizationId", "=", organizationId)
      .executeTakeFirst();

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // If slug changed, ensure it's not taken
    if (slug && slug !== category.slug) {
      const existing = await db
        .selectFrom("product_categories")
        .select("id")
        .where("organizationId", "=", organizationId)
        .where("slug", "=", slug)
        .executeTakeFirst();
      if (existing) {
        return NextResponse.json(
          { error: "Slug already exists" },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await db
      .updateTable("product_categories")
      .set({
        name,
        image,
        slug,
        parentId,
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = await getOrgIdOrThrow(req);
    const { id } = params;

    // Check if category exists
    const category = await db
      .selectFrom("product_categories")
      .selectAll()
      .where("id", "=", id)
      .where("organizationId", "=", organizationId)
      .executeTakeFirst();

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Make sure no children exist
    const children = await db
      .selectFrom("product_categories")
      .select("id")
      .where("parentId", "=", id)
      .execute();

    if (children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with subcategories" },
        { status: 400 }
      );
    }

    // Delete
    await db.deleteFrom("product_categories").where("id", "=", id).execute();

    return NextResponse.json({ message: "Category deleted" });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
