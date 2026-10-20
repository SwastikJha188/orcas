import { NextResponse, type NextRequest } from "next/server";
import { currentUserId, fail, failFrom, ok, requestScope } from "@/app/api/_lib/respond";
import { requireCase } from "@/server/services/access-service";
import { addFile, getCase, getFile, removeFile } from "@/server/services/case-service";

export const runtime = "nodejs";

/** GET /api/cases/:id/files?fileId= → the file. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCase(await requestScope(request), Number((await params).id));
    const f = await getFile(Number((await params).id), Number(request.nextUrl.searchParams.get("fileId")));
    return new NextResponse(new Uint8Array(f.data), {
      headers: { "content-type": f.type, "content-disposition": `attachment; filename="${encodeURIComponent(f.name)}"; filename*=UTF-8''${encodeURIComponent(f.name)}` },
    });
  } catch (error) {
    return failFrom(error, "FILE_FAILED");
  }
}

/** POST /api/cases/:id/files (multipart form, field "file", up to 10 MB) */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail(400, "INVALID_INPUT", "Choose a file");
    await addFile(id, { name: file.name, type: file.type, data: Buffer.from(await file.arrayBuffer()) }, user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "FILE_FAILED");
  }
}

/** DELETE /api/cases/:id/files?fileId= */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUserId(request);
  if (!user) return fail(401, "SIGN_IN", "Sign in to change a case.");
  try {
    const id = Number((await params).id);
    await requireCase(await requestScope(request), id);
    await removeFile(id, Number(request.nextUrl.searchParams.get("fileId")), user);
    return ok(await getCase(id));
  } catch (error) {
    return failFrom(error, "FILE_FAILED");
  }
}
