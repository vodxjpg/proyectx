// /app/api/internal/set-password/route.ts

// ---------- NEW LINES START ----------
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// ---------- NEW LINES END ----------

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";
import { nanoid } from "nanoid"; // Default nanoid
import { customAlphabet } from "nanoid"; // For custom length

// Custom nanoid generator for 32-character IDs
const generateCustomId = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 32);

// IMPORTANT: Must match your .env
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";

export async function POST(request: NextRequest) {
  // 1) Check internal token
  const token = request.headers.get("x-internal-token");
  if (token !== INTERNAL_TOKEN) {
    console.log("Unauthorized: Invalid or missing x-internal-token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 2) Check session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    console.log("No session found. Headers:", Object.fromEntries(request.headers));
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  console.log("Session validated for user:", session.user.id);

  // 3) Parse body
  const { newPassword } = await request.json();
  if (!newPassword || newPassword.length < 8) {
    console.log("Invalid password input:", newPassword);
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    // 4) Check if account already exists
    const existingAccount = await db
      .selectFrom("account")
      .select(["id"])
      .where("userId", "=", session.user.id)
      .where("providerId", "=", "credential")
      .executeTakeFirst();

    if (existingAccount) {
      console.log("Account already exists for user:", session.user.id);
      return NextResponse.json({ error: "Password already set" }, { status: 400 });
    }

    // 5) Hash the password using Better Auth's scrypt
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(newPassword);
    console.log("Password hashed successfully");

    // 6) Use the userId from the session
    const userId = session.user.id;
    const accountId = generateCustomId(); // 32-char ID

    // 7) Insert new account row
    await db
      .insertInto("account")
      .values({
        id: accountId,
        accountId: userId,    // Typically matches user table id
        providerId: "credential",
        userId: userId,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();

    console.log("New account created for user:", session.user.id, "with accountId:", accountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting password:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
