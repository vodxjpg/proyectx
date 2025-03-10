import { NextResponse } from "next/server";
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

// Initialize the auth client for server-side use
const authClient = createAuthClient({
  baseURL: "http://localhost:3000/api/auth", // Adjust if your auth endpoint differs
  plugins: [organizationClient()],
});

export async function POST(request: Request) {
  try {
    const { email, role, organizationId } = await request.json();

    console.log("Received invite request:", { email, role, organizationId });

    // Validate required fields
    if (!email || !role || !organizationId) {
      console.error("Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: email, role, or organizationId" },
        { status: 400 }
      );
    }

    // Use the client-side method server-side
    await authClient.organization.inviteMember({
      email,
      role,
      organizationId,
    });

    console.log("Invitation sent successfully for:", email);

    return NextResponse.json({ success: "Invitation sent successfully" });
  } catch (error) {
    console.error("Full error details:", {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
    return NextResponse.json(
      { error: "Failed to send invitation: " + error.message },
      { status: 500 }
    );
  }
}