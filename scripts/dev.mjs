/**
 * Development: runs the backend (backend/, :4000) and the Next.js frontend
 * (:3000, forwarding /api to the backend) together. Ctrl-C stops both.
 */
import { spawn } from "node:child_process";

const procs = [
  ["api", ["run", "dev", "-w", "backend"]],
  ["web", ["run", "dev:web"]],
].map(([name, args]) => {
  const child = spawn("npm", args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => {
      for (const line of String(chunk).split("\n")) if (line) process.stdout.write(`[${name}] ${line}\n`);
    });
  child.on("exit", (code) => {
    console.log(`[${name}] exited (${code ?? "signal"})`);
    stop();
  });
  return child;
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (p.exitCode === null) p.kill("SIGTERM");
  setTimeout(() => process.exit(0), 2_000).unref();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
