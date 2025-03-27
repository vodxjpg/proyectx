// /app/api/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";

export async function GET(request: NextRequest) {
  // Verify the request includes the correct internal token.
  const token = request.headers.get("x-internal-token");
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get the user's session via Better Auth.
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // Fetch the user record from the database.
    const userData = await db
      .selectFrom("user")
      .select(["id", "name", "email", "role", "createdAt", "updatedAt"])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(userData);
  } catch (error: any) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
