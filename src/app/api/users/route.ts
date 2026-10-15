import { NextRequest, NextResponse } from "next/server";
import { CreateUserInput, UserServiceError, createUser, listUsers } from "@/server/services/user-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const data = await listUsers(plantId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: { code: "USERS_FETCH_ERROR", message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateUserInput;
    const data = await createUser(body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const status = error instanceof UserServiceError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: { code: "USER_CREATE_ERROR", message } }, { status });
  }
}
