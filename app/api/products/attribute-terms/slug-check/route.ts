import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/utils/auth"
import { db } from "@/utils/db"

/** Helper: get the active org ID or throw */
async function getOrgIdOrThrow(req: NextRequest) {
  const sessionResponse = await auth.api.getSession({ headers: req.headers })
  if (!sessionResponse || !sessionResponse.session) {
    throw new Error("Unauthorized")
  }
  const activeOrgId = sessionResponse.session.activeOrganizationId
  if (!activeOrgId) throw new Error("No active organization in session")
  return activeOrgId
}

/** GET /api/products/attribute-terms/slug-check */
export async function GET(req: NextRequest) {
  try {
    const orgId = await getOrgIdOrThrow(req)
    const { searchParams } = new URL(req.url)

    const attributeId = searchParams.get("attributeId")
    const slug = searchParams.get("slug")
    const excludeId = searchParams.get("excludeId") // optional

    if (!attributeId || !slug) {
      return NextResponse.json(
        { error: "attributeId and slug are required" },
        { status: 400 }
      )
    }

    let query = db
      .selectFrom("product_attribute_terms")
      .select("id")
      .where("organizationId", "=", orgId)
      .where("attributeId", "=", attributeId)
      .where("slug", "=", slug)

    if (excludeId) {
      query = query.where("id", "!=", excludeId)
    }

    const existing = await query.executeTakeFirst()
    if (existing) {
      return NextResponse.json({ exists: true })
    }
    return NextResponse.json({ exists: false })
  } catch (err: any) {
    const isUnauthorized = err.message === "Unauthorized"
    return NextResponse.json({ error: err.message }, { status: isUnauthorized ? 401 : 400 })
  }
}
