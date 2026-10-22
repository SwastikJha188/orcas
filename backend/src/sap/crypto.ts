import crypto from "crypto";
import { SapError, type SapCredentials } from "./types";

/**
 * SAP credentials at rest: AES-256-GCM with SAP_CREDENTIALS_ENCRYPTION_KEY
 * (32 bytes, hex or base64). Stored as `v1.<iv>.<tag>.<ciphertext>`.
 */

const VERSION = "v1";

function encryptionKey(): Buffer {
  const raw = process.env.SAP_CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!raw) throw new SapError(503, "SAP credential encryption is not set up on the server (SAP_CREDENTIALS_ENCRYPTION_KEY).");
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new SapError(503, "SAP_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function encryptSapCredentials(credentials: SapCredentials): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSapCredentials(value: string): SapCredentials {
  try {
    const [version, iv, tag, payload] = value.split(".");
    if (version !== VERSION || !iv || !tag || !payload) throw new Error("unsupported credential format");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const clear = Buffer.concat([decipher.update(Buffer.from(payload, "base64url")), decipher.final()]).toString("utf8");
    return JSON.parse(clear) as SapCredentials;
  } catch (error) {
    if (error instanceof SapError) throw error;
    throw new SapError(503, "The stored SAP credentials cannot be decrypted. Enter them again in the connection settings.");
  }
}
