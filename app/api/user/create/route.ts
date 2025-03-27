// /app/api/user/create/route.ts
import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { customAlphabet } from "nanoid"; // Import customAlphabet instead of nanoid

// Custom nanoid generator for 32-character IDs
const generateCustomId = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 32);

export async function POST(request: Request) {
  const { email, invitationId } = await request.json();

  if (!email || !invitationId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const userId = generateCustomId(); // Generate a unique 32-character user ID
    await db
      .insertInto("user")
      .values({
        id: userId,
        email,
        name: email.split("@")[0], // Default name from email
        emailVerified: 1, // Assume verified since they’re invited
        role: "user",
        onboardingCompleted: 1, // Skip onboarding
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();

    return NextResponse.json({ userId });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}