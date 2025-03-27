// File: app/api/product-categories/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { db } from "@/utils/db";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1) Validate session
    const sessionResponse = await auth.api.getSession({ headers: req.headers });
    if (!sessionResponse || !sessionResponse.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = sessionResponse.user.id;

    // 2) Find the tenant that belongs to this user (assuming 1:1)
    const tenantRecord = await db
      .selectFrom("tenant")
      .select(["id"])
      .where("ownerUserId", "=", userId)
      .executeTakeFirst();

    // If user has no tenant, pick something
    const tenantId = tenantRecord ? String(tenantRecord.id) : "no-tenant";

    // 3) Also check the user’s active org
    const organizationId = sessionResponse.session?.activeOrganizationId || "no-org";
    if (organizationId === "no-org") {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // 4) Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 5) Validate file type + size
    const validMimeTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > 1024 * 1024) {
      // 1 MB
      return NextResponse.json({ error: "File too large (max 1MB)" }, { status: 400 });
    }

    // 6) Build the folder structure
    const uploadsDir = path.join(process.cwd(), "public", "uploads", tenantId, organizationId);
    await fs.mkdir(uploadsDir, { recursive: true });

    // 7) Create a unique file name
    const ext = file.name?.split(".").pop() || "png";
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    // 8) Convert file to buffer + write
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // 9) Final public path
    const imageURL = `/uploads/${tenantId}/${organizationId}/${uniqueName}`;
    return NextResponse.json({ imageURL }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
