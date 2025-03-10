import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth"; // Server-side auth instance
import { db } from "@/utils/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { organizationId: string; memberId: string } }
) {
  const { organizationId, memberId } = params;

  try {
    // Fetch the member's userId from the database before removing
    const member = await db
      .selectFrom("member")
      .select(["userId"])
      .where("id", "=", memberId)
      .where("organizationId", "=", organizationId)
      .executeTakeFirst();

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    const userId = member.userId;

    // Remove the member using the server-side auth instance
    await auth.api.removeMember({
      body: { memberIdOrEmail: memberId, organizationId },
      headers: request.headers, // Pass headers if required by your auth library
    });

    // Check if the user is a tenant
    const tenant = await db
      .selectFrom("tenant")
      .select(["id"])
      .where("ownerUserId", "=", userId)
      .executeTakeFirst();

    const isTenant = !!tenant;

    if (!isTenant) {
      // Clean up dependent records
      await db.deleteFrom("session").where("userId", "=", userId).execute();
      await db.deleteFrom("account").where("userId", "=", userId).execute();
      await db.deleteFrom("organization_support_email").where("userId", "=", userId).execute();
      await db.deleteFrom("invitation").where("inviterId", "=", userId).execute();

      // Delete the user
      await db.deleteFrom("user").where("id", "=", userId).execute();
    }

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (err) {
    console.error("Error removing member:", err);
    return NextResponse.json(
      { error: "Failed to remove member", details: err.message },
      { status: 500 }
    );
  }
}