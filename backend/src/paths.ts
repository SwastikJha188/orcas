import path from "node:path";
import { fileURLToPath } from "node:url";

/** backend/ — this file is src/paths.ts in development and part of dist/index.js once bundled, one level down either way. */
export const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The repository root (onboarding-work/, .claude/skills). */
export const REPO_DIR = path.resolve(BACKEND_DIR, "..");
