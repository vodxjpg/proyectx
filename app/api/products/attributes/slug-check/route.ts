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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get("slug")
    const excludeId = searchParams.get("excludeId") // optional

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      )
    }

    const organizationId = await getOrgIdOrThrow(req)

    // Check if this slug already exists in product_attributes table
    let query = db
      .selectFrom("product_attributes")
      .select("id")
      .where("organizationId", "=", organizationId)
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
    return NextResponse.json(
      { error: err.message },
      { status: isUnauthorized ? 401 : 400 }
    )
  }
}
