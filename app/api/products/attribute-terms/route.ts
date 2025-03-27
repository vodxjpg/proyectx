import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/utils/auth"
import { db } from "@/utils/db"

async function getOrgIdOrThrow(req: NextRequest) {
  const sessionResponse = await auth.api.getSession({ headers: req.headers })
  if (!sessionResponse || !sessionResponse.session) {
    throw new Error("Unauthorized")
  }
  const activeOrgId = sessionResponse.session.activeOrganizationId
  if (!activeOrgId) throw new Error("No active organization in session")
  return activeOrgId
}

/** GET /api/products/attribute-terms?attributeId=...  
 *  returns all terms for the given attribute
 */
export async function GET(req: NextRequest) {
  try {
    const orgId = await getOrgIdOrThrow(req)
    const { searchParams } = new URL(req.url)
    const attributeId = searchParams.get("attributeId")

    if (!attributeId) {
      return NextResponse.json({ error: "Attribute ID is required" }, { status: 400 })
    }

    const terms = await db
      .selectFrom("product_attribute_terms")
      .selectAll()
      .where("organizationId", "=", orgId)
      .where("attributeId", "=", attributeId)
      .orderBy("name", "asc")
      .execute()

    // If also checking "slug" existence within this route? 
    // We do that in slug-check route now, so no need here.
    const slug = searchParams.get("slug")
    if (slug) {
      // This might be leftover code if you used ?slug=...
      // We'll skip since we have a separate slug-check route now.
    }

    return NextResponse.json(terms)
  } catch (error: any) {
    const isUnauthorized = error.message === "Unauthorized"
    return NextResponse.json({ error: error.message }, { status: isUnauthorized ? 401 : 400 })
  }
}

/** POST /api/products/attribute-terms  
 *  create a new term
 */
export async function POST(req: NextRequest) {
  try {
    const orgId = await getOrgIdOrThrow(req)
    const { attributeId, name, slug } = await req.json()

    if (!attributeId || !name || !slug) {
      return NextResponse.json(
        { error: "attributeId, name, and slug are required" },
        { status: 400 }
      )
    }

    // check for existing slug
    const existing = await db
      .selectFrom("product_attribute_terms")
      .select("id")
      .where("organizationId", "=", orgId)
      .where("attributeId", "=", attributeId)
      .where("slug", "=", slug)
      .executeTakeFirst()

    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists for this attribute" },
        { status: 400 }
      )
    }

    const id = crypto.randomUUID()
    const created = await db
      .insertInto("product_attribute_terms")
      .values({
        id,
        attributeId,
        name,
        slug,
        organizationId: orgId,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    const isUnauthorized = error.message === "Unauthorized"
    return NextResponse.json({ error: error.message }, { status: isUnauthorized ? 401 : 400 })
  }
}

/** PUT /api/products/attribute-terms
 *  update an existing term
 */
export async function PUT(req: NextRequest) {
  try {
    const orgId = await getOrgIdOrThrow(req)
    const { id, attributeId, name, slug } = await req.json()

    if (!id || !attributeId || !name || !slug) {
      return NextResponse.json(
        { error: "ID, attributeId, name, and slug are required" },
        { status: 400 }
      )
    }

    // Check if slug is used by another term in the same attribute
    const existing = await db
      .selectFrom("product_attribute_terms")
      .select("id")
      .where("organizationId", "=", orgId)
      .where("attributeId", "=", attributeId)
      .where("slug", "=", slug)
      .where("id", "!=", id)
      .executeTakeFirst()

    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists for this attribute" },
        { status: 400 }
      )
    }

    const updated = await db
      .updateTable("product_attribute_terms")
      .set({ name, slug })
      .where("id", "=", id)
      .where("attributeId", "=", attributeId)
      .where("organizationId", "=", orgId)
      .returningAll()
      .executeTakeFirstOrThrow()

    return NextResponse.json(updated)
  } catch (error: any) {
    const isUnauthorized = error.message === "Unauthorized"
    return NextResponse.json({ error: error.message }, { status: isUnauthorized ? 401 : 400 })
  }
}

/** 
 * DELETE /api/products/attribute-terms  
 *  delete a single term 
 */
export async function DELETE(req: NextRequest) {
  try {
    const orgId = await getOrgIdOrThrow(req)
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // If this term is referenced in some child table, we remove them first
    // (similar to your approach with product_attributes).
    // e.g. if you had a `product_attribute_term_values` table referencing these:
    // await db
    //   .deleteFrom("product_attribute_term_values")
    //   .where("termId", "=", id)
    //   .execute()

    await db
      .deleteFrom("product_attribute_terms")
      .where("id", "=", id)
      .where("organizationId", "=", orgId)
      .execute()

    return NextResponse.json({ message: "Term deleted" })
  } catch (error: any) {
    const isUnauthorized = error.message === "Unauthorized"
    return NextResponse.json({ error: error.message }, { status: isUnauthorized ? 401 : 400 })
  }
}