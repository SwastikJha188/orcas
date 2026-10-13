"use client";

import { useEffect, useRef, type ComponentType } from "react";
import {
  HomeIcon,
  AssetsIcon,
  DevicesIcon,
  AssetIQIcon,
  ConfigureIcon,
} from "./navigation-icons";
import { ThemeToggle } from "./theme-toggle";
import { CopilotLauncher } from "./copilot/copilot";
import { ContextSwitchers } from "./context-switchers";

export type WorkspaceTab = "home" | "assets" | "devices" | "assetiq" | "configure";

interface LiquidGlassShellProps {
  activeTab?: WorkspaceTab;
  onSelectTab?: (tab: WorkspaceTab) => void;
}

const filters = new Map<string, { id: string; node: SVGFilterElement; refs: number }>();
let defs: SVGSVGElement | null = null;
let nextId = 0;

function supportsRefraction() {
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands;
  return brands ? brands.some(({ brand }) => /Chromium|Google Chrome|Microsoft Edge/i.test(brand)) : /Chrome\//.test(navigator.userAgent);
}

function getDefs() {
  if (!defs?.isConnected) {
    const ns = "http://www.w3.org/2000/svg";
    defs = document.createElementNS(ns, "svg");
    defs.setAttribute("width", "0");
    defs.setAttribute("height", "0");
    defs.setAttribute("aria-hidden", "true");
    defs.style.position = "fixed";
    defs.append(document.createElementNS(ns, "defs"));
    document.body.append(defs);
  }
  return defs.querySelector("defs")!;
}

function makeMap(width: number, height: number, radius: number) {
  const sample = Math.max(0.25, Math.min(2, 1400 / Math.max(width, height)));
  const w = Math.max(1, Math.round(width * sample));
  const h = Math.max(1, Math.round(height * sample));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const image = canvas.getContext("2d")!.createImageData(w, h);
  const pageW = window.innerWidth;
  const pageH = window.innerHeight;
  const r = radius * sample;
  const dx = new Float32Array(w * h);
  const dy = new Float32Array(w * h);
  let max = 0;

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = (x + .5) / w;
    const cy = (y + .5) / h;
    const tx = Math.abs(x + .5 - w / 2) - (w / 2 - r);
    const ty = Math.abs(y + .5 - h / 2) - (h / 2 - r);
    const distance = Math.max(-(Math.hypot(Math.max(tx, 0), Math.max(ty, 0)) + Math.min(Math.max(tx, ty), 0) - r), 0) / sample;
    const edge = Math.exp(-distance * .5) * .015;
    const rim = Math.exp(-distance * 1.7) * .028;
    let nx = cx - .5, ny = cy - .5;
    const length = Math.hypot(nx, ny);
    if (length) { nx /= length; ny /= length; }
    const corner = Math.exp(-(Math.max(Math.min(cx, 1 - cx), Math.min(cy, 1 - cy)) * Math.min(width, height)) * .3) * .06;
    const ripple = Math.sin((distance / Math.min(width, height)) * 25) * .26 * Math.exp(-distance * 1.7);
    const index = y * w + x;
    dx[index] = (nx * (edge + rim + corner) - ny * ripple) * pageW;
    dy[index] = (ny * (edge + rim + corner) + nx * ripple) * pageH;
    max = Math.max(max, Math.abs(dx[index]), Math.abs(dy[index]));
  }

  const scale = Math.max(max * 2, .0001);
  const bias = scale * (128 / 255 - .5);
  for (let i = 0; i < w * h; i++) {
    image.data[i * 4] = Math.max(0, Math.min(255, Math.round(255 * (.5 + (dx[i] - bias) / scale))));
    image.data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(255 * (.5 + (dy[i] - bias) / scale))));
    image.data[i * 4 + 2] = 128;
    image.data[i * 4 + 3] = 255;
  }
  canvas.getContext("2d")!.putImageData(image, 0, 0);
  return { map: canvas.toDataURL("image/png"), scale };
}

function filterKey(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const radius = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0, Math.min(rect.width, rect.height) / 2);
  return { rect, radius, key: [Math.round(rect.width), Math.round(rect.height), radius, innerWidth, innerHeight].join("|") };
}

function attachFilter(element: HTMLElement) {
  const { rect, radius, key } = filterKey(element);
  let entry = filters.get(key);
  if (!entry?.node.isConnected) {
    const { map, scale } = makeMap(Math.round(rect.width), Math.round(rect.height), radius);
    const ns = "http://www.w3.org/2000/svg";
    const filter = document.createElementNS(ns, "filter");
    const id = `ultron-liquid-glass-${nextId++}`;
    const margin = scale / 2 + 2.1;
    filter.setAttribute("id", id);
    filter.setAttribute("x", `${-(margin / rect.width) * 100}%`);
    filter.setAttribute("y", `${-(margin / rect.height) * 100}%`);
    filter.setAttribute("width", `${100 + (margin / rect.width) * 200}%`);
    filter.setAttribute("height", `${100 + (margin / rect.height) * 200}%`);
    filter.setAttribute("color-interpolation-filters", "sRGB");
    const image = document.createElementNS(ns, "feImage");
    image.setAttribute("href", map); image.setAttribute("width", String(rect.width)); image.setAttribute("height", String(rect.height)); image.setAttribute("result", "map");
    const displacement = document.createElementNS(ns, "feDisplacementMap");
    displacement.setAttribute("in", "SourceGraphic"); displacement.setAttribute("in2", "map"); displacement.setAttribute("scale", String(scale)); displacement.setAttribute("xChannelSelector", "R"); displacement.setAttribute("yChannelSelector", "G"); displacement.setAttribute("result", "displaced");
    const blur = document.createElementNS(ns, "feGaussianBlur");
    blur.setAttribute("in", "displaced"); blur.setAttribute("stdDeviation", ".7");
    filter.append(image, displacement, blur);
    getDefs().append(filter);
    entry = { id, node: filter, refs: 0 };
    filters.set(key, entry);
  }
  entry.refs++;
  element.style.backdropFilter = `url(#${entry.id})`;
  const release = () => {
    if (--entry.refs === 0) { entry.node.remove(); filters.delete(key); }
  };
  return { key, release };
}

/** Rebuild the refraction map only after resizing settles, and only when the size actually changed. */
const REBUILD_DELAY_MS = 200;

function useLiquidGlass(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !supportsRefraction()) return;
    let current = attachFilter(element);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rebuild = () => {
      if (filterKey(element).key === current.key) return;
      // Attach the new filter before releasing the old one so a shared map is never torn down and rebuilt.
      const next = attachFilter(element);
      current.release();
      current = next;
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(rebuild, REBUILD_DELAY_MS); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener("resize", schedule); // the map is scaled to the viewport too
    return () => { observer.disconnect(); window.removeEventListener("resize", schedule); clearTimeout(timer); current.release(); };
  }, [ref]);
}

const PRIMARY: Array<{ id: WorkspaceTab; label: string; Icon: ComponentType<{ className?: string }> }> = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "assets", label: "Assets", Icon: AssetsIcon },
  { id: "devices", label: "Devices", Icon: DevicesIcon },
  { id: "assetiq", label: "AssetIQ", Icon: AssetIQIcon },
];

function RailButton({ id, label, Icon, active, onSelect }: { id: WorkspaceTab; label: string; Icon: ComponentType<{ className?: string }>; active: boolean; onSelect?: (tab: WorkspaceTab) => void }) {
  return (
    <button
      type="button"
      className={`rail-btn ${active ? "active" : ""}`}
      onClick={() => onSelect?.(id)}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <Icon />
    </button>
  );
}

export function LiquidGlassShell({ activeTab = "home", onSelectTab }: LiquidGlassShellProps) {
  const top = useRef<HTMLElement>(null);
  const rail = useRef<HTMLElement>(null);
  useLiquidGlass(top);
  useLiquidGlass(rail);

  return (
    <>
      <header ref={top} className="navbar liquid-glass" aria-label="Top navigation">
        <button type="button" className="brand-btn" onClick={() => onSelectTab?.("home")} aria-label="ULTRON home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-dark.png" alt="" className="brand-logo brand-logo-dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-light.png" alt="" className="brand-logo brand-logo-light" />
        </button>
        <div className="cp-topbar-actions">
          <ContextSwitchers />
          <CopilotLauncher />
          <ThemeToggle />
        </div>
      </header>

      <nav ref={rail} className="nav-rail liquid-glass" aria-label="Primary navigation">
        <div className="nav-rail-group">
          {PRIMARY.map((item) => (
            <RailButton key={item.id} {...item} active={activeTab === item.id} onSelect={onSelectTab} />
          ))}
        </div>
        <div className="rail-divider" />
        <div className="nav-rail-group">
          <RailButton id="configure" label="Configure" Icon={ConfigureIcon} active={activeTab === "configure"} onSelect={onSelectTab} />
        </div>
      </nav>

      <footer className="info-bar" aria-label="Product information">
        <span>ORCAS.v.jg.3</span>
        <span>Copyright © OSWAR TECK INC.</span>
      </footer>
    </>
  );
}
