import { NextRequest, NextResponse } from "next/server";
import { UpdateUserInput, UserServiceError, deleteUser, getUserById, updateUser } from "@/server/services/user-service";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getUserById(id);
    if (!data) {
      return NextResponse.json({ error: { code: "USER_NOT_FOUND", message: `User '${id}' not found` } }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load user";
    return NextResponse.json({ error: { code: "USER_FETCH_ERROR", message } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateUserInput;
    const data = await updateUser(id, body);
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof UserServiceError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: { code: "USER_UPDATE_ERROR", message } }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteUser(id);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const status = error instanceof UserServiceError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: { code: "USER_DELETE_ERROR", message } }, { status });
  }
}
