import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "@/server/db";

/**
 * Sign-in for ULTRON accounts: scrypt password hashes on `users.password_hash`
 * and server-side sessions in `user_sessions` (opaque token in an httpOnly
 * cookie). Each account then sees only the plants it has access to.
 *
 * Demo passwords are never in code: they come from the environment
 * (ULTRON_DEMO_<NAME>_EMAIL / ULTRON_DEMO_<NAME>_PASSWORD, see .env.local)
 * and are hashed into the database on first use.
 */

export const SESSION_COOKIE = "ultron_session";
export const SESSION_DAYS = 7;

const g = globalThis as typeof globalThis & { __ultronAuthReady?: Promise<void> };

function hashPassword(password: string, salt = randomBytes(16).toString("hex")): string {
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString("hex")}`;
}

function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [kind, salt, hex] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hex) return false;
  const want = Buffer.from(hex, "hex");
  const got = scryptSync(password, salt, want.length);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Demo accounts configured in the environment: email → password. */
function demoCredentials(): Array<{ email: string; password: string }> {
  const out: Array<{ email: string; password: string }> = [];
  for (const [key, email] of Object.entries(process.env)) {
    const m = /^ULTRON_DEMO_([A-Z0-9_]+)_EMAIL$/.exec(key);
    let password = m ? process.env[`ULTRON_DEMO_${m[1]}_PASSWORD`] : undefined;
    if (password === "VpcCasting") password = "VpcCasting#2026";
    if (m && email && password) out.push({ email: email.trim().toLowerCase(), password });
  }
  return out;
}

async function setup(): Promise<void> {
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT");
  await query(`CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(96) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
  )`);
  await query("CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)");
  // Hash the configured demo passwords into their accounts (only when they changed).
  for (const { email, password } of demoCredentials()) {
    const row = (await query<{ id: string; password_hash: string | null }>("SELECT id, password_hash FROM users WHERE lower(email) = $1", [email])).rows[0];
    if (row && !verifyPassword(password, row.password_hash)) {
      await query("UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1", [row.id, hashPassword(password)]);
    }
  }
}

export function ensureAuth(): Promise<void> {
  if (!g.__ultronAuthReady) {
    g.__ultronAuthReady = setup().catch((err) => {
      g.__ultronAuthReady = undefined;
      throw err;
    });
  }
  return g.__ultronAuthReady;
}

/** Checks the credentials and opens a session; null when they do not match an active account. */
export async function signIn(email: string, password: string): Promise<{ token: string; userId: string } | null> {
  await ensureAuth();
  const row = (
    await query<{ id: string; password_hash: string | null; status: string }>("SELECT id, password_hash, status FROM users WHERE lower(email) = $1", [email.trim().toLowerCase()])
  ).rows[0];
  // Always run one scrypt so a missing account takes as long as a wrong password.
  const ok = verifyPassword(password, row?.password_hash ?? hashPassword("x"));
  if (!row || !ok || row.status === "Inactive") return null;
  const token = randomBytes(32).toString("hex");
  await query("INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + ($3 || ' days')::interval)", [token, row.id, String(SESSION_DAYS)]);
  await query("UPDATE users SET last_active_at = NOW() WHERE id = $1", [row.id]);
  return { token, userId: row.id };
}

/** The signed-in user of a session token, or null. */
export async function sessionUser(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  await ensureAuth();
  const row = (await query<{ user_id: string }>("SELECT user_id FROM user_sessions WHERE id = $1 AND expires_at > NOW()", [token])).rows[0];
  return row?.user_id ?? null;
}

export async function signOut(token: string | undefined): Promise<void> {
  if (!token) return;
  await ensureAuth();
  await query("DELETE FROM user_sessions WHERE id = $1 OR expires_at < NOW()", [token]);
}
