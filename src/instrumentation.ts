// On Vercel (no ULTRON_API_URL) the backend runs inside this deploy, so its
// background work starts with the Next.js server instead of backend/src/index.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.VERCEL && !process.env.ULTRON_API_URL) {
    const { startBackground } = await import("@backend/background");
    startBackground();
  }
}
