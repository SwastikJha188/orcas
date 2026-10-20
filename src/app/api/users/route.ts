import { NextRequest, NextResponse } from "next/server";
import { CreateUserInput, UserServiceError, createUser, listUsers } from "@/server/services/user-service";
import { AccessError, assertCanChangeUser, plantFilter, requireActor, scopedUser } from "@/server/services/access-service";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { SESSION_COOKIE } from "@/server/services/auth-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const plantId = new URL(request.url).searchParams.get("plantId") || undefined;
    const scope = await requestScope(request);
    plantFilter(scope, plantId);
    const data = (await listUsers(plantId)).map((u) => scopedUser(scope, u)).filter((u) => u !== null);
    return NextResponse.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: { code: "USERS_FETCH_ERROR", message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request.cookies.get(SESSION_COOKIE)?.value);
    const body = (await request.json()) as CreateUserInput;
    await assertCanChangeUser(actor, null, body);
    const data = await createUser(body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const status = error instanceof UserServiceError || error instanceof AccessError ? error.status : 500;
    const code = error instanceof AccessError ? error.code : "USER_CREATE_ERROR";
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: { code, message } }, { status });
  }
}
