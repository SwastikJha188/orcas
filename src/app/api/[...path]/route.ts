import { app } from "@backend/app";

/**
 * On Vercel the backend runs inside this deploy: every /api request goes
 * straight to the Hono app (backend/src/app.ts). Anywhere ULTRON_API_URL is set,
 * and in local development, next.config.ts forwards /api to the standalone
 * backend server before this route is reached.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handle = (request: Request) => app.fetch(request);

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS, handle as HEAD };
