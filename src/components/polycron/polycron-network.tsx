"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  SOURCE_LINKS,
  SOURCE_NODES,
  type PolycronLink,
} from "./polycron-data";

export interface GraphPoint {
  x: number;
  y: number;
  size: number;
  id: string;
  title: string;
  kind: string;
  machine?: string;
  hub: boolean;
}

export interface GraphEdge {
  a: number;
  b: number;
  source?: PolycronLink;
  flow?: boolean;
}

interface TacticalPacket {
  edgeIndex: number;
  fromA: boolean;
  t: number;
  speed: number;
  color: string;
}

function makeGraph() {
  const byId = new Map<string, number>();
  const points: GraphPoint[] = SOURCE_NODES.map((node, index) => {
    byId.set(node.id, index);
    return {
      x: node.x,
      y: node.y,
      size: node.size,
      id: node.id,
      title: node.label,
      kind: node.kind,
      machine: node.machine,
      hub: !!node.hub,
    };
  });

  const edges: GraphEdge[] = [];
  const edgeKeys = new Map<string, number>();

  const addEdge = (a: number, b: number, source?: PolycronLink, flow?: boolean) => {
    if (a === b || a < 0 || b < 0 || a >= points.length || b >= points.length) return;
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    const existing = edgeKeys.get(key);
    if (existing !== undefined) {
      if (source) edges[existing].source = source;
      if (flow) edges[existing].flow = true;
      return;
    }
    edgeKeys.set(key, edges.length);
    edges.push({ a, b, source, flow });
  };

  for (const link of SOURCE_LINKS) {
    const a = byId.get(link.from);
    const b = byId.get(link.to);
    if (a !== undefined && b !== undefined) {
      addEdge(a, b, link, link.flow);
    }
  }

  const adjacency: Set<number>[] = points.map(() => new Set<number>());
  for (const edge of edges) {
    adjacency[edge.a].add(edge.b);
    adjacency[edge.b].add(edge.a);
  }

  return { points, edges, adjacency, byId };
}

export const POLY_GRAPH = makeGraph();

export function graphNeighbors(id: string) {
  const index = POLY_GRAPH.byId.get(id);
  return index === undefined
    ? []
    : Array.from(POLY_GRAPH.adjacency[index]).map((other) => POLY_GRAPH.points[other]);
}

export function graphEdges(id: string) {
  const index = POLY_GRAPH.byId.get(id);
  return index === undefined
    ? []
    : POLY_GRAPH.edges.filter((edge) => edge.a === index || edge.b === index);
}

function project(width: number, height: number) {
  const sx = width * 0.46;
  const sy = Math.min(height * 0.68, width * 0.58);
  const cx = width * 0.5;
  const cy = height * 0.52;
  return POLY_GRAPH.points.map((p) => ({
    x: cx + p.x * sx,
    y: cy + p.y * sy,
  }));
}

export function PolycronNetwork({
  selectedId,
  onSelect,
  onOpen,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [themeRevision, setThemeRevision] = useState(0);
  const projected = useMemo(() => project(size.width, size.height), [size]);
  const selectedIndex = selectedId ? POLY_GRAPH.byId.get(selectedId) : undefined;

  const highlighted = useMemo(() => {
    if (selectedIndex === undefined) return new Set<number>();
    return new Set([selectedIndex, ...Array.from(POLY_GRAPH.adjacency[selectedIndex])]);
  }, [selectedIndex]);

  // Viewport resize tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Theme observer
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setThemeRevision((revision) => revision + 1)
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-palette"],
    });
    return () => observer.disconnect();
  }, []);

  // 60FPS Tactical Defense Display - Electric Chartreuse / Radar Lime & Pure White
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !size.width || !size.height || projected.length === 0)
      return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const klnIdx = POLY_GRAPH.byId.get("KLN-01") ?? 3;
    const klnPos = projected[klnIdx] || { x: size.width * 0.5, y: size.height * 0.52 };

    // Discrete data packets strictly in chartreuse lime tones
    const NUM_PACKETS = 48;
    const packets: TacticalPacket[] = Array.from({ length: NUM_PACKETS }, (_, i) => ({
      edgeIndex: Math.floor((i / NUM_PACKETS) * POLY_GRAPH.edges.length),
      fromA: i % 2 === 0,
      t: (i / NUM_PACKETS),
      speed: 0.16 + (i % 4) * 0.07,
      color: i % 2 === 0 ? "#ccff00" : "#a3e635",
    }));

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const time = now * 0.001;

      ctx.clearRect(0, 0, size.width, size.height);
      const chosen = selectedIndex !== undefined;

      // ============================================================
      // 1. TACTICAL GRATICULE & DEFENSE GRID (CHARTREUSE LIME & BLACK)
      // ============================================================
      ctx.save();
      const gridSize = 72;
      ctx.strokeStyle = "rgba(204, 255, 0, 0.035)";
      ctx.lineWidth = 1;

      // Hairline grid
      ctx.beginPath();
      for (let x = 0; x < size.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size.height);
      }
      for (let y = 0; y < size.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(size.width, y);
      }
      ctx.stroke();

      // Precision crosshairs at alternate grid vertices
      ctx.strokeStyle = "rgba(204, 255, 0, 0.18)";
      ctx.lineWidth = 1;
      for (let x = gridSize; x < size.width; x += gridSize * 2) {
        for (let y = gridSize; y < size.height; y += gridSize * 2) {
          ctx.beginPath();
          ctx.moveTo(x - 3.5, y);
          ctx.lineTo(x + 3.5, y);
          ctx.moveTo(x, y - 3.5);
          ctx.lineTo(x, y + 3.5);
          ctx.stroke();
        }
      }

      // Tactical Sector Dividers
      const secLeft = size.width * 0.32;
      const secRight = size.width * 0.68;

      ctx.strokeStyle = "rgba(204, 255, 0, 0.09)";
      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.moveTo(secLeft, 48);
      ctx.lineTo(secLeft, size.height - 48);
      ctx.moveTo(secRight, 48);
      ctx.lineTo(secRight, size.height - 48);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tactical Sector Labels
      ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "rgba(204, 255, 0, 0.45)";
      ctx.textAlign = "left";
      ctx.fillText("[SEC-01 // FEED & PREHEAT]", 24, size.height - 52);
      ctx.textAlign = "center";
      ctx.fillText("[SEC-02 // THERMAL REACTION CORE]", size.width * 0.5, size.height - 52);
      ctx.textAlign = "right";
      ctx.fillText("[SEC-03 // CLINKER & DISPATCH]", size.width - 24, size.height - 52);

      // Top corner telemetry stamps
      ctx.textAlign = "left";
      ctx.fillText("GRID: 48.2N // LAT: PYRO-1024", 24, 76);
      ctx.textAlign = "right";
      ctx.fillText("TACTICAL TOPOLOGY // C4ISR", size.width - 24, 76);

      // ============================================================
      // 2. RADAR RANGE RINGS & TACTICAL NORTH INDICATOR
      // ============================================================
      const radarR1 = Math.min(size.width, size.height) * 0.16;
      const radarR2 = Math.min(size.width, size.height) * 0.30;
      const radarR3 = Math.min(size.width, size.height) * 0.44;

      // Range ring 1: 100M
      ctx.beginPath();
      ctx.arc(klnPos.x, klnPos.y, radarR1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(204, 255, 0, 0.12)";
      ctx.stroke();

      // Range ring 2: 250M with dashed intervals
      ctx.beginPath();
      ctx.arc(klnPos.x, klnPos.y, radarR2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(204, 255, 0, 0.10)";
      ctx.setLineDash([4, 12]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Range ring 3: Outer ring with cardinal azimuth ticks
      ctx.beginPath();
      ctx.arc(klnPos.x, klnPos.y, radarR3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(204, 255, 0, 0.08)";
      ctx.stroke();

      const cardinals = ["000°", "045°", "090°", "135°", "180°", "225°", "270°", "315°"];
      ctx.font = "500 9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "rgba(204, 255, 0, 0.4)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let k = 0; k < 8; k++) {
        const theta = (k / 8) * Math.PI * 2 - Math.PI / 2;
        const tickInner = radarR3 - 4;
        const tickOuter = radarR3 + 4;
        ctx.beginPath();
        ctx.moveTo(klnPos.x + Math.cos(theta) * tickInner, klnPos.y + Math.sin(theta) * tickInner);
        ctx.lineTo(klnPos.x + Math.cos(theta) * tickOuter, klnPos.y + Math.sin(theta) * tickOuter);
        ctx.strokeStyle = "rgba(204, 255, 0, 0.25)";
        ctx.stroke();

        const labelX = klnPos.x + Math.cos(theta) * (radarR3 + 14);
        const labelY = klnPos.y + Math.sin(theta) * (radarR3 + 14);
        ctx.fillText(cardinals[k], labelX, labelY);
      }

      // Tracking Crosshairs
      ctx.beginPath();
      ctx.moveTo(klnPos.x - radarR3 - 8, klnPos.y);
      ctx.lineTo(klnPos.x + radarR3 + 8, klnPos.y);
      ctx.moveTo(klnPos.x, klnPos.y - radarR3 - 8);
      ctx.lineTo(klnPos.x, klnPos.y + radarR3 + 8);
      ctx.strokeStyle = "rgba(204, 255, 0, 0.06)";
      ctx.stroke();

      // Sweeping Radar Azimuth Line (Chartreuse Lime Beam)
      const sweepAngle = (time * 0.42) % (Math.PI * 2);
      const sweepX = klnPos.x + Math.cos(sweepAngle) * radarR3;
      const sweepY = klnPos.y + Math.sin(sweepAngle) * radarR3;

      const trailAngle = 0.32;
      const grad = ctx.createRadialGradient(klnPos.x, klnPos.y, 0, klnPos.x, klnPos.y, radarR3);
      grad.addColorStop(0, "rgba(204, 255, 0, 0.08)");
      grad.addColorStop(1, "rgba(204, 255, 0, 0.005)");

      ctx.beginPath();
      ctx.moveTo(klnPos.x, klnPos.y);
      ctx.arc(klnPos.x, klnPos.y, radarR3, sweepAngle - trailAngle, sweepAngle, false);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Sweeping beam line
      ctx.beginPath();
      ctx.moveTo(klnPos.x, klnPos.y);
      ctx.lineTo(sweepX, sweepY);
      ctx.strokeStyle = "rgba(204, 255, 0, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tactical North Compass Arrow (Bottom Right in Electric Chartreuse)
      const compX = size.width - 48;
      const compY = size.height - 84;
      ctx.beginPath();
      ctx.moveTo(compX, compY + 28);
      ctx.lineTo(compX, compY);
      ctx.strokeStyle = "#ccff00";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(compX - 6, compY + 10);
      ctx.lineTo(compX, compY);
      ctx.lineTo(compX + 6, compY + 10);
      ctx.fillStyle = "#ccff00";
      ctx.fill();

      ctx.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "#ccff00";
      ctx.textAlign = "center";
      ctx.fillText("N", compX, compY + 44);

      ctx.restore();

      // ============================================================
      // 3. ELECTRIC CHARTREUSE MESH & ARTERIAL PROCESS HIGHWAYS
      // ============================================================
      ctx.save();

      // Dense Chartreuse / Lime Mesh Lines
      ctx.beginPath();
      for (const edge of POLY_GRAPH.edges) {
        if (edge.flow) continue; // draw arterial flows separately in bold chartreuse
        if (chosen && (edge.a === selectedIndex || edge.b === selectedIndex))
          continue;
        const p1 = projected[edge.a];
        const p2 = projected[edge.b];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.strokeStyle = chosen ? "rgba(204, 255, 0, 0.04)" : "rgba(204, 255, 0, 0.35)";
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // Bold Electric Chartreuse Process Highway Lines (11 genuine clinker process flows)
      ctx.beginPath();
      for (const edge of POLY_GRAPH.edges) {
        if (!edge.flow) continue;
        if (chosen && (edge.a === selectedIndex || edge.b === selectedIndex))
          continue;
        const p1 = projected[edge.a];
        const p2 = projected[edge.b];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.strokeStyle = chosen ? "rgba(204, 255, 0, 0.25)" : "#ccff00";
      ctx.lineWidth = 2.0;
      ctx.shadowColor = "rgba(204, 255, 0, 0.5)";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Target lock connected edges (When a node is selected)
      if (chosen) {
        ctx.beginPath();
        for (const edge of POLY_GRAPH.edges) {
          if (edge.a !== selectedIndex && edge.b !== selectedIndex) continue;
          const p1 = projected[edge.a];
          const p2 = projected[edge.b];
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.strokeStyle = "#ccff00";
        ctx.lineWidth = 2.2;
        ctx.shadowColor = "#ccff00";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // ============================================================
      // 4. DISCRETE TACTICAL DATA PACKETS (WHITE & CHARTREUSE BLIPS)
      // ============================================================
      ctx.save();
      for (let i = 0; i < packets.length; i++) {
        const pkt = packets[i];
        pkt.t += dt * pkt.speed * (chosen ? 1.5 : 1.0);
        if (pkt.t >= 1) {
          pkt.t = 0;
          const edge = POLY_GRAPH.edges[pkt.edgeIndex];
          const targetNode = pkt.fromA ? edge.b : edge.a;
          const neighborEdges = POLY_GRAPH.edges.filter(
            (e) => e.a === targetNode || e.b === targetNode
          );
          if (neighborEdges.length > 0) {
            const nextEdge = neighborEdges[Math.floor(Math.random() * neighborEdges.length)];
            pkt.edgeIndex = POLY_GRAPH.edges.indexOf(nextEdge);
            pkt.fromA = nextEdge.a === targetNode;
          }
        }

        const edge = POLY_GRAPH.edges[pkt.edgeIndex];
        if (!edge) continue;

        const p1 = projected[edge.a];
        const p2 = projected[edge.b];
        const t = pkt.fromA ? pkt.t : 1 - pkt.t;
        const px = p1.x + (p2.x - p1.x) * t;
        const py = p1.y + (p2.y - p1.y) * t;

        const isPktActive = chosen && (edge.a === selectedIndex || edge.b === selectedIndex);
        if (chosen && !isPktActive) continue;

        // Sharp rectangular digital data packet blip (3px x 3px) in chartreuse
        ctx.fillStyle = isPktActive ? "#ccff00" : pkt.color;
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
      ctx.restore();

      // ============================================================
      // 5. NODES: SOLID ELECTRIC CHARTREUSE HUBS & LIME VERTICES
      // ============================================================
      ctx.save();
      for (let i = 0; i < POLY_GRAPH.points.length; i++) {
        const point = POLY_GRAPH.points[i];
        const p = projected[i];
        const active = highlighted.has(i);
        const isSelected = i === selectedIndex;

        // Field Telemetry micro-vertices (Chartreuse Lime Dots)
        if (!point.hub) {
          ctx.fillStyle = chosen
            ? active
              ? "#ccff00"
              : "rgba(204, 255, 0, 0.08)"
            : point.size > 2.5
            ? "#d4f434"
            : "#a3e635";
          ctx.globalAlpha = chosen ? (active ? 1 : 0.08) : 0.85;
          ctx.beginPath();
          ctx.arc(p.x, p.y, active ? 3.2 : Math.max(1.1, point.size * 0.95), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        // Primary Asset Hubs: Solid bright Electric Chartreuse circles
        const r = isSelected ? 6.5 : 4.8;

        // Outer crisp chartreuse aura
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(204, 255, 0, 0.22)";
        ctx.fill();

        // Inner solid chartreuse circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#ccff00";
        ctx.globalAlpha = 1;
        ctx.fill();

        // Target Lock Reticle for Selected Node
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.strokeStyle = "#ccff00";
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // 4-corner brackets
          const bLen = 4;
          const bOff = 20;
          ctx.strokeStyle = "#ccff00";
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          // Top-left
          ctx.moveTo(p.x - bOff, p.y - bOff + bLen);
          ctx.lineTo(p.x - bOff, p.y - bOff);
          ctx.lineTo(p.x - bOff + bLen, p.y - bOff);
          // Top-right
          ctx.moveTo(p.x + bOff - bLen, p.y - bOff);
          ctx.lineTo(p.x + bOff, p.y - bOff);
          ctx.lineTo(p.x + bOff, p.y - bOff + bLen);
          // Bottom-left
          ctx.moveTo(p.x - bOff, p.y + bOff - bLen);
          ctx.lineTo(p.x - bOff, p.y + bOff);
          ctx.lineTo(p.x - bOff + bLen, p.y + bOff);
          // Bottom-right
          ctx.moveTo(p.x + bOff - bLen, p.y + bOff);
          ctx.lineTo(p.x + bOff, p.y + bOff);
          ctx.lineTo(p.x + bOff, p.y + bOff - bLen);
          ctx.stroke();
        }
      }
      ctx.restore();

      // ============================================================
      // 6. ASSET CALLOUT LABELS (ELECTRIC CHARTREUSE MONOSPACE TEXT)
      // ============================================================
      if (!chosen) {
        ctx.save();
        ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        for (let i = 0; i < POLY_GRAPH.points.length; i++) {
          const point = POLY_GRAPH.points[i];
          if (!point.hub) continue;
          const p = projected[i];

          const text = point.id;

          // Crisp chartreuse text with dark shadow backing
          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 4;
          ctx.fillStyle = "#ccff00";
          ctx.fillText(text, p.x, p.y - 8);
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [size, projected, selectedIndex, highlighted, themeRevision]);

  // Click & Hover hit-testing
  const locate = (x: number, y: number) => {
    let winner = -1;
    let best = Infinity;
    for (let i = 0; i < projected.length; i++) {
      const d = (projected[i].x - x) ** 2 + (projected[i].y - y) ** 2;
      if (d < best) {
        best = d;
        winner = i;
      }
    }
    const hitRadius = winner >= 0 && POLY_GRAPH.points[winner].hub ? 22 : 12;
    return best <= hitRadius ** 2 ? winner : -1;
  };

  const onCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = locate(event.clientX - rect.left, event.clientY - rect.top);
    onSelect(index < 0 ? null : POLY_GRAPH.points[index].id);
  };

  const onCanvasMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = locate(event.clientX - rect.left, event.clientY - rect.top);
    event.currentTarget.style.cursor = index >= 0 ? "pointer" : "default";
  };

  // Position tactical callouts for selected target and direct connections
  const callouts =
    selectedIndex === undefined
      ? []
      : [selectedIndex, ...Array.from(POLY_GRAPH.adjacency[selectedIndex])].slice(0, 8);

  const occupied: { x: number; y: number }[] = [];
  const positioned = callouts.map((index) => {
    const spot = projected[index];
    const width = 148;
    const height = 32;
    const candidates = [
      [spot.x + 14, spot.y - 44],
      [spot.x - width - 14, spot.y - 44],
      [spot.x + 14, spot.y + 14],
      [spot.x - width - 14, spot.y + 14],
    ];
    let chosen = candidates[0];
    for (const candidate of candidates) {
      const x = Math.max(8, Math.min(size.width - width - 8, candidate[0]));
      const y = Math.max(80, Math.min(size.height - height - 44, candidate[1]));
      if (
        !occupied.some(
          (box) =>
            Math.abs(box.x - x) < width + 4 && Math.abs(box.y - y) < height + 4
        )
      ) {
        chosen = [x, y];
        break;
      }
    }
    const x = Math.max(8, Math.min(size.width - width - 8, chosen[0]));
    const y = Math.max(80, Math.min(size.height - height - 44, chosen[1]));
    occupied.push({ x, y });
    return { index, x, y };
  });

  return (
    <div className="poly-network">
      <canvas
        ref={canvasRef}
        className="poly-network-canvas"
        onClick={onCanvasClick}
        onMouseMove={onCanvasMove}
        aria-label="Tactical defense C4ISR radar network tracking 1,024 plant engineering nodes. Select an asset to acquire target lock and view direct relationships."
        role="img"
      />
      {positioned.map(({ index, x, y }) => (
        <button
          key={index}
          type="button"
          className={`poly-node-callout${
            index === selectedIndex ? " is-selected" : ""
          }`}
          style={{ left: x, top: y }}
          onClick={() => onOpen(POLY_GRAPH.points[index].id)}
          aria-label={`Inspect telemetry for ${POLY_GRAPH.points[index].title}`}
          title={`Inspect telemetry for ${POLY_GRAPH.points[index].title}`}
        >
          <span>{POLY_GRAPH.points[index].title}</span>
          <span aria-hidden="true">↗</span>
        </button>
      ))}
    </div>
  );
}
