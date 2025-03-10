// /app/api/check-membership/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authClient } from "@/utils/auth-client";

export async function POST(request: NextRequest) {
  const { email, organizationId } = await request.json();

  try {
    const org = await authClient.organization.getFullOrganization({
      organizationId,
    });

    const isMember = org.data.members.some(
      (member) => member.user.email.toLowerCase() === email.toLowerCase()
    );

    return NextResponse.json({ isMember });
  } catch (err) {
    console.error("Error checking membership:", err);
    return NextResponse.json(
      { error: "Failed to check membership", details: err.message },
      { status: 500 }
    );
  }
}