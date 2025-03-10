// /app/api/internal/settings/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "";

export async function POST(request: NextRequest) {
  // 1) Check internal token
  const token = request.headers.get("x-internal-token");
  if (token !== INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 2) Check session
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // 3) Parse body
  const { oldPassword, newPassword } = await request.json();
  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "Missing old or new password" }, { status: 400 });
  }

  try {
    // 4) Fetch the user’s account row
    const userId = session.user.id;
    const accountRecord = await db
      .selectFrom("account")
      .select(["id", "password", "providerId"])
      .where("userId", "=", userId)
      .executeTakeFirst();

    if (!accountRecord || !accountRecord.password) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // If user is not using 'credential', they might not have a real password
    if (accountRecord.providerId !== "credential") {
      return NextResponse.json(
        { error: "No password to update (OAuth user or different provider)" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // Debug log: check if it's the correct scrypt format
    console.log("DEBUG: Stored password hash =>", accountRecord.password);
    // Typically it should look like: "$scrypt$N=16384,r=8,p=1$<salt>$<hash>"
    // If it's empty or in a different format, verify will throw an error.
    // ------------------------------------------------------------------------

    // 5) Use Better Auth’s built-in scrypt verify
    const ctx = await auth.$context;
    let isValid: boolean;
    try {
      isValid = await ctx.password.verify({ password: oldPassword, hash: accountRecord.password });
    } catch (verifyErr: any) {
      console.error("Error verifying old password with scrypt:", verifyErr);
      return NextResponse.json(
        {
          error:
            "The stored password format is invalid or doesn't match scrypt. " +
            "Please reset your password via 'forget password' or contact support."
        },
        { status: 400 }
      );
    }

    if (!isValid) {
      return NextResponse.json({ error: "Old password is incorrect" }, { status: 400 });
    }

    // 6) Use Better Auth’s scrypt hashing for new password
    const newHashedPassword = await ctx.password.hash(newPassword);

    // 7) Update DB with the new hashed password
    await db
      .updateTable("account")
      .set({ password: newHashedPassword, updatedAt: new Date().toISOString() })
      .where("id", "=", accountRecord.id)
      .execute();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error changing password:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
