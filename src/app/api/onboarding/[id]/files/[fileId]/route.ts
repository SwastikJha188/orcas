import { NextResponse, type NextRequest } from "next/server";
import { canAdminister, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { deleteFile, fileContent } from "@/server/services/onboarding-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

/** GET /api/onboarding/:id/files/:fileId → the uploaded file itself (for the processor or a download). */
export async function GET(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const { id, fileId } = await params;
    const f = await fileContent(id, Number(fileId));
    return new NextResponse(new Uint8Array(f.bytes), {
      headers: {
        "Content-Type": f.mime,
        "Content-Disposition": `attachment; filename="${f.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failFrom(error, "ONBOARDING_FILE_FAILED");
  }
}

/** DELETE /api/onboarding/:id/files/:fileId → removes an upload. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const { id, fileId } = await params;
    await deleteFile(id, Number(fileId));
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, "ONBOARDING_FILE_DELETE_FAILED");
  }
}
