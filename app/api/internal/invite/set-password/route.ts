// /app/api/internal/invite/set-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-internal-token");
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, password } = await request.json();
  if (!userId || !password) {
    return NextResponse.json({ error: "Missing userId or password" }, { status: 400 });
  }

  try {
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(password);

    await db
      .insertInto("account")
      .values({
        id: `${userId}-credential`,
        userId,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error setting password:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}