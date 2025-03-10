import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db"; // Your database setup
import { randomBytes } from "crypto";

export async function GET(request: NextRequest, { params }: { params: { invitationId: string } }) {
  const { invitationId } = params;

  try {
    // Validate the invitation
    const invitation = await db
      .selectFrom("invitation")
      .where("id", "=", invitationId)
      .where("status", "=", "pending")
      .where("expiresAt", ">", new Date().toISOString())
      .select(["email", "organizationId", "role"])
      .executeTakeFirst();

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    // Check if the user exists
    const user = await db
      .selectFrom("user")
      .where("email", "=", invitation.email)
      .select(["id"])
      .executeTakeFirst();

    if (!user) {
      // Create the user if they don’t exist
      const userId = generateId();
      await db
        .insertInto("user")
        .values({
          id: userId,
          email: invitation.email,
          name: invitation.email.split("@")[0], // Default name
          emailVerified: 1, // Adjust as needed
          onboardingCompleted: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .execute();

      // Return redirect URL for setting password
      return NextResponse.json({ redirectTo: `/set-password?invitationId=${invitationId}` });
    } else {
      // User exists, return redirect URL for login
      return NextResponse.json({ redirectTo: `/login?invitationId=${invitationId}` });
    }
  } catch (error) {
    console.error("Error processing invitation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateId(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = randomBytes(32);
  for (let i = 0; i < 32; i++) {
    const index = bytes[i] % characters.length;
    result += characters[index];
  }
  return result;
}