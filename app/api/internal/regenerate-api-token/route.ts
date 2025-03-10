import { NextResponse } from "next/server";
import { db, saveCustomTokenMapping } from "@/utils/db";
import { randomBytes } from "crypto";
import { auth } from "@/utils/auth"; // Import your Better-auth configuration

export async function POST(req: Request) {
  // Validate internal token header
  const internalToken = req.headers.get("x-internal-token");
  if (!internalToken || internalToken !== process.env.NEXT_PUBLIC_INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Parse JSON body
  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId in request body" }, { status: 400 });
  }

  // Retrieve the user from the database
  const user = await db
    .selectFrom("user")
    .select(["id", "email", "name", "role"])
    .where("id", "=", userId)
    .executeTakeFirst();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // Generate JWT token directly using Better-auth’s method.
    // This bypasses the need to call the /api/auth/token endpoint
    // with a session token that we don’t have here.
    const jwtToken = await auth.jwt.generateToken(user);

    // Create a custom token formatted as: tt-<hexPart1>-<hexPart2>
    const part1 = randomBytes(12).toString("hex");
    const part2 = randomBytes(12).toString("hex");
    const customToken = `tt-${part1}-${part2}`;

    // Save the mapping between the custom token and the real JWT
    await saveCustomTokenMapping({
      userId: user.id,
      customToken,
      jwtToken,
      createdAt: new Date(),
    });

    // Return the custom token (this is your public API key)
    return NextResponse.json({ token: customToken });
  } catch (error) {
    console.error("Error regenerating token:", error);
    return NextResponse.json({ error: "Error regenerating token" }, { status: 500 });
  }
}
