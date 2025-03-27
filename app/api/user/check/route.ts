// /app/api/check-user/route.ts
import { NextResponse } from "next/server";
import { db } from "@/utils/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const user = await db
      .selectFrom("user")
      .where("email", "=", email)
      .select("id")
      .executeTakeFirst();

    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}