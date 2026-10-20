/**
 * Shared by the onboarding scripts: the app's base URL (ULTRON_API, default
 * http://localhost:3000) and, for a production server, the session cookie of a
 * user who may manage plants (ULTRON_SESSION="ultron_session=…").
 */
export const BASE = (process.env.ULTRON_API || "http://localhost:3000").replace(/\/$/, "");
const headers = () => (process.env.ULTRON_SESSION ? { cookie: process.env.ULTRON_SESSION } : {});

export async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    const body = type.includes("json") ? await res.json().catch(() => null) : null;
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${body?.error?.message ?? res.statusText}`);
  }
  return type.includes("json") ? (await res.json()).data : Buffer.from(await res.arrayBuffer());
}

export const postJson = (path, body) => api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
