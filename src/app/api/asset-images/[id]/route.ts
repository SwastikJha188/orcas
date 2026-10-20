import { NextResponse, type NextRequest } from "next/server";
import { canAdminister, failFrom, forbidden, ok } from "@/app/api/_lib/respond";
import { deleteImage, imageContent } from "@/server/services/asset-image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/asset-images/:id → the photo itself. */
export async function GET(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    const f = await imageContent(Number((await params).id));
    return new NextResponse(new Uint8Array(f.bytes), {
      headers: {
        "Content-Type": f.mime,
        "Content-Disposition": `inline; filename="${f.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_FAILED");
  }
}

/** DELETE /api/asset-images/:id → removes a photo (a drawing already made from it stays). */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await canAdminister(request))) return forbidden();
  try {
    await deleteImage(Number((await params).id));
    return ok({ deleted: true });
  } catch (error) {
    return failFrom(error, "ASSET_IMAGE_DELETE_FAILED");
  }
}
