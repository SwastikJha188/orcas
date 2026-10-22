import dns from "dns/promises";
import net from "net";
import { InputError } from "@backend/errors";
import { isSimUrl } from "./sim/origin";

/**
 * SAP addresses: HTTPS only (HTTP on a development server), no credentials in
 * the URL, and no private network hosts unless SAP_ALLOW_PRIVATE_NETWORKS=true
 * (the server must not be turned into a way into the plant network).
 */

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (net.isIPv6(address)) {
    const v = address.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:");
  }
  return true;
}

export function normalizeSapUrl(value: string, what = "SAP address"): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new InputError(`${what} is not a valid URL.`);
  }
  if (url.username || url.password) throw new InputError(`Do not put a user name or password in the ${what}.`);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) {
    throw new InputError(`${what} must start with https://.`);
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export async function assertSafeSapUrl(value: string): Promise<void> {
  if (process.env.SAP_ALLOW_PRIVATE_NETWORKS === "true" || isSimUrl(value)) return;
  const host = new URL(value).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new InputError("Private SAP hosts need SAP_ALLOW_PRIVATE_NETWORKS=true on the server.");
  }
  const found = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (found.length === 0) throw new InputError(`The SAP host ${host} could not be found.`);
  if (found.some((e) => isPrivateIp(e.address))) throw new InputError("The SAP host is on a private network; that needs SAP_ALLOW_PRIVATE_NETWORKS=true on the server.");
}

/** A path (or a continuation link) on the SAP system; never another origin. */
export function joinSapUrl(baseUrl: string, pathOrUrl: string): string {
  const base = new URL(baseUrl);
  const resolved = new URL(pathOrUrl, `${base.toString().replace(/\/$/, "")}/`);
  if (resolved.origin !== base.origin) throw new InputError("SAP sent a link to another address.");
  return resolved.toString();
}
