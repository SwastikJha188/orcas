#!/usr/bin/env node
/**
 * Diagram lab: renders a machine-kit 2D sheet (.tsx exporting `sheet`) or 3D
 * model (.ts exporting `model`) to PNG with headless Chrome, and prints a JSON
 * report (errors, warnings, measurements). No dev server, database or browser
 * pane needed.
 *
 *   node scripts/diagram-lab/render.mjs <file> [--out <png>] [--theme dark|light|both] [--size 1600x1000]
 *
 * Exit code 1 when the file does not compile or the report has errors.
 * One-time setup: (cd scripts/diagram-lab && npm install).
 */
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const file = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!file) {
  console.error("usage: node scripts/diagram-lab/render.mjs <file.tsx|file.ts> [--out out.png] [--theme dark|light|both] [--size WxH]");
  process.exit(2);
}
const abs = path.resolve(file);
const src = readFileSync(abs, "utf8");
const is3d = /export\s+const\s+model\b/.test(src) || (!/export\s+const\s+sheet\b/.test(src) && abs.endsWith(".ts"));
const themes = (opt("theme", "dark") === "both" ? ["dark", "light"] : [opt("theme", "dark")]);
const [vw, vh] = (opt("size", is3d ? "1600x1000" : "1600x0")).split("x").map(Number);
const outBase = opt("out", abs.replace(/\.(tsx?|jsx?)$/, ".png"));

let esbuild;
try {
  esbuild = await import(path.join(here, "node_modules/esbuild/lib/main.js"));
} catch {
  console.error("esbuild missing: run (cd scripts/diagram-lab && npm install) once.");
  process.exit(2);
}

// Static checks a renderer cannot see.
const lint = [];
if (!is3d) {
  const hex = src.match(/["'`]#[0-9a-fA-F]{3,8}["'`]|rgba?\([^)]*\)/g);
  if (hex) lint.push(`Hard-coded colours in source: ${[...new Set(hex)].slice(0, 8).join(", ")} — use MX.* / PAINT.* only.`);
  if (/<(image|foreignObject|style)\b/.test(src)) lint.push("No <image>, <foreignObject> or <style> in the art.");
  if (/font-?[sS]ize=\{?["']?(\d+)/.test(src)) {
    const sizes = [...src.matchAll(/fontSize=\{?\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])).filter((n) => n > 14);
    if (sizes.length) lint.push(`Large label font sizes (${[...new Set(sizes)].join(", ")}): labels are 7–12 units.`);
  }
} else {
  if (/new THREE\.Mesh(?![^;]*mats\.)/.test(src) && /MeshStandardMaterial|MeshBasicMaterial|MeshPhongMaterial/.test(src)) lint.push("Do not create materials: use the `mats` passed to build().");
  if (/color\s*:\s*["'`]?#|0x[0-9a-fA-F]{6}/.test(src)) lint.push("Hard-coded colours: use the `mats` passed to build().");
}

// Type check the file on its own (esbuild only strips types): a wrong argument to a kit part
// is reported at its line here instead of turning into NaN geometry or a blank sheet.
{
  const tcDir = mkdtempSync(path.join(tmpdir(), "diagram-tc-"));
  const tcConfig = path.join(tcDir, "tsconfig.json");
  writeFileSync(
    tcConfig,
    JSON.stringify({ extends: path.join(repo, "tsconfig.json"), compilerOptions: { noEmit: true, incremental: false, skipLibCheck: true }, include: [], files: [abs] }),
  );
  const tsc = spawnSync(process.execPath, [path.join(repo, "node_modules/typescript/bin/tsc"), "-p", tcConfig, "--pretty", "false"], { cwd: repo, encoding: "utf8", timeout: 120000 });
  rmSync(tcDir, { recursive: true, force: true });
  const mine = (tsc.stdout ?? "")
    .split("\n")
    .filter((l) => l.startsWith(abs) || l.startsWith(path.relative(repo, abs)))
    .map((l) => l.replace(/^.*?\((\d+),(\d+)\): error TS\d+: /, "Line $1: "));
  for (const m of mine.slice(0, 15)) lint.push(`Type error (fix the call — check the part's options in reference.md): ${m}`);
}

const work = mkdtempSync(path.join(tmpdir(), "diagram-lab-"));
const entry = path.join(work, "entry.tsx");
writeFileSync(
  entry,
  is3d
    ? `import * as mod from ${JSON.stringify(abs)};\nimport { mount3d } from ${JSON.stringify(path.join(here, "page-3d.ts"))};\nmount3d(mod as Record<string, unknown>);\n`
    : `import * as mod from ${JSON.stringify(abs)};\nimport { mount2d } from ${JSON.stringify(path.join(here, "page-2d.tsx"))};\nmount2d(mod as Record<string, unknown>);\n`,
);
let bundle;
try {
  const r = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    target: "es2022",
    alias: { "@": path.join(repo, "src") },
    nodePaths: [path.join(repo, "node_modules")],
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  bundle = r.outputFiles[0].text;
} catch (e) {
  const msgs = (e.errors ?? []).map((m) => `${m.location ? `${path.relative(process.cwd(), m.location.file)}:${m.location.line}:${m.location.column} ` : ""}${m.text}`);
  console.log(JSON.stringify({ file, compiled: false, errors: msgs.length ? msgs : [String(e)] }, null, 2));
  rmSync(work, { recursive: true, force: true });
  process.exit(1);
}
const css = readFileSync(path.join(repo, "src/app/globals.css"), "utf8");

// 2D page height follows the sheet's aspect ratio (set once the sheet is known) unless --size gives one.
const fixedHeight = vh > 0;
const height = vh || 900;

const reports = [];
let failed = false;
for (const theme of themes) {
  const html = `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css}\nhtml,body{margin:0;background:var(--mx-canvas);overflow:hidden}#labels{position:fixed;inset:0;pointer-events:none;font:600 12px/1 ${"ui-sans-serif, system-ui"};letter-spacing:.08em;text-transform:uppercase;color:var(--mx-label)}</style></head><body><div id="root"></div><div id="labels"></div><script>window.addEventListener("error",e=>{(window.__labErrors=window.__labErrors||[]).push(String(e.error&&e.error.stack||e.message))});</script><script>${bundle.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
  const page = path.join(work, `page-${theme}.html`);
  writeFileSync(page, html);
  const out = themes.length > 1 ? outBase.replace(/\.png$/, `-${theme}.png`) : outBase;
  const res = await shoot(page, out, vw, height);
  const rep = { file, theme, png: out, compiled: true, ...res };
  if (lint.length) rep.errors = [...(rep.errors ?? []), ...lint];
  if ((rep.errors ?? []).length) failed = true;
  reports.push(rep);
}
rmSync(work, { recursive: true, force: true });
console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
process.exit(failed ? 1 : 0);

/** Opens the page in headless Chrome over the DevTools protocol, waits for the report, saves a PNG. */
async function shoot(page, out, width, height) {
  const profile = mkdtempSync(path.join(tmpdir(), "diagram-lab-chrome-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--allow-file-access-from-files",
      `--window-size=${width},${height}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const port = await new Promise((resolve, reject) => {
    let buf = "";
    const t = setTimeout(() => reject(new Error("Chrome did not start")), 20000);
    chrome.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
      if (m) {
        clearTimeout(t);
        resolve(Number(m[1]));
      }
    });
  });
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    let id = 0;
    const pending = new Map();
    const consoleErrors = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      } else if (msg.method === "Runtime.exceptionThrown") consoleErrors.push(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text);
      else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
    });
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const n = ++id;
        pending.set(n, resolve);
        ws.send(JSON.stringify({ id: n, method, params }));
      });
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `file://${page}` });
    let report = null;
    for (let i = 0; i < 200 && !report; i++) {
      await new Promise((r) => setTimeout(r, 150));
      const r = await send("Runtime.evaluate", { expression: "window.__labDone ? JSON.stringify({ r: window.__labReport, e: window.__labErrors || [] }) : null", returnByValue: true });
      const v = r.result?.result?.value;
      if (v) report = JSON.parse(v);
    }
    // 2D: size the page to the sheet's aspect ratio before the screenshot.
    const sh = report?.r?.sheet;
    if (Array.isArray(sh) && !fixedHeight) {
      const h = Math.round(((width - 32) * (sh[1] + 24)) / (sh[0] + 24) + 32);
      await send("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: 1, mobile: false });
    }
    await new Promise((r) => setTimeout(r, 300));
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(out, Buffer.from(shot.result.data, "base64"));
    ws.close();
    if (!report) return { errors: ["The page never finished (an exception during render?)", ...consoleErrors] };
    const errs = [...(report.r?.errors ?? []), ...report.e, ...consoleErrors.filter((c) => !report.e.some((x) => String(x).includes(String(c).split("\n")[0])))];
    return { ...report.r, errors: errs };
  } finally {
    chrome.kill("SIGKILL");
    setTimeout(() => existsSync(profile) && rmSync(profile, { recursive: true, force: true }), 500);
  }
}
