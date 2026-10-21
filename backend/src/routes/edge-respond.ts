import { EdgeError } from "@backend/services/edge-service";
import type { ApiFailure } from "@shared/types/api";

export function fail(status: number, code: string, message: string) {
  const body: ApiFailure = { error: { code, message } };
  return Response.json(body, { status });
}

export function failFrom(err: unknown, fallbackCode: string) {
  if (err instanceof EdgeError) return fail(err.status, err.code, err.message);
  console.error(`[edge] ${fallbackCode}`, err);
  return fail(500, fallbackCode, err instanceof Error ? err.message : "Request failed.");
}

export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
