import { NextResponse } from "next/server";
import { listRoles } from "@/server/services/user-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await listRoles();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load roles";
    return NextResponse.json({ error: { code: "ROLES_FETCH_ERROR", message } }, { status: 500 });
  }
}
