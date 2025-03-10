// /app/api/invite/[invitationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { nanoid } from "nanoid";
import { authClient } from "@/utils/auth-client"; // Client-side auth for API

export async function GET(request: NextRequest, { params }: { params: { invitationId: string } }) {
  const { invitationId } = params;

  try {
    // Fetch the invitation
    const invitation = await db
      .selectFrom("invitation")
      .selectAll()
      .where("id", "=", invitationId)
      .where("status", "=", "pending")
      .where("expiresAt", ">", new Date().toISOString())
      .executeTakeFirst();

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    // Check if user exists and their onboarding status
    let user = await db
      .selectFrom("user")
      .select(["id", "onboardingCompleted"])
      .where("email", "=", invitation.email)
      .executeTakeFirst();

    let userId: string;

    if (!user) {
      // Create new user with onboardingCompleted = 1
      userId = nanoid();
      const name = invitation.email.split("@")[0];

      await db
        .insertInto("user")
        .values({
          id: userId,
          email: invitation.email,
          name,
          role: "user",
          emailVerified: 1, // Assume verified since they clicked the invite
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          onboardingCompleted: 1,
        })
        .execute();
    } else {
      userId = user.id;
    }

    // Trigger magic link for all invited users (new or existing with onboardingCompleted = 1)
    const callbackURL = `/accept-invite?invitationId=${invitationId}`;
    await authClient.signIn.magicLink({
      email: invitation.email,
      callbackURL,
    });

    // Return a response indicating redirection to check-email
    return NextResponse.json({
      status: "magic_link_sent",
      email: invitation.email,
      redirectTo: "/check-email",
    });

  } catch (err) {
    console.error("Error processing invitation:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}