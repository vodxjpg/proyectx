// /app/api/internal/settings/update-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";

export async function POST(request: NextRequest) {
  // Verify internal token
  const token = request.headers.get("x-internal-token");
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Verify user session via Better Auth
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const userId = session.user.id;

  // Parse request body
  const { firstName, lastName } = await request.json();

  try {
    // Update the user's name (assuming the user table has a "name" field)
    await db
      .updateTable("user")
      .set({ name: `${firstName} ${lastName}`, updatedAt: new Date().toISOString() })
      .where("id", "=", userId)
      .execute();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
