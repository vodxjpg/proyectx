import { NextResponse } from "next/server";
import { db } from "@/utils/db";

export async function GET(request: Request) {
  // Get the slug from the URL (e.g., ?slug=my-org)
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  // If no slug is provided, send an error message
  if (!slug) {
    console.log("No slug was sent to check.");
    return NextResponse.json(
      { error: "Slug parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Look in the database for an organization with this slug
    console.log(`Checking if slug "${slug}" exists...`);
    const existingOrg = await db
      .selectFrom("organization")
      .select(["id", "slug"])
      .where("slug", "=", slug)
      .executeTakeFirst();

    // If we found an organization, the slug is taken
    if (existingOrg) {
      console.log(`Slug "${slug}" already exists with ID: ${existingOrg.id}`);
      return NextResponse.json({ exists: true });
    } else {
      // If not found, the slug is free to use
      console.log(`Slug "${slug}" is available`);
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    // If something goes wrong (like a database error), log it and send an error
    console.error("Slug in use, please try another one.:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}