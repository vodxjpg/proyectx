import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth"; // Adjust based on your auth setup
import { db } from "@/utils/db"; // Adjust based on your DB setup

export async function POST(req: NextRequest) {
  try {
    // Retrieve the session using Better Auth's getSession method
    const sessionResponse = await auth.api.getSession({ headers: req.headers });
    if (!sessionResponse || !sessionResponse.session) {
      throw new Error("Unauthorized");
    }

    // Extract the active organization ID from the session
    const organizationId = sessionResponse.session.activeOrganizationId;
    if (!organizationId) {
      throw new Error("No active organization in session");
    }

    // Parse the request body to get the IDs to delete
    const { ids } = await req.json();

    // Validate the IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    // Perform the bulk delete operation
    await db
      .deleteFrom("product_attribute_terms")
      .where("id", "in", ids)
      .where("organizationId", "=", organizationId)
      .execute();

    return NextResponse.json({ message: "Terms deleted" });
  } catch (error: any) {
    console.error("Bulk delete error:", error.message);
    if (error.message === "Unauthorized" || error.message === "No active organization in session") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}