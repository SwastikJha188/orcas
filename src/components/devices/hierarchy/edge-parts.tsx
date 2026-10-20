"use client";

import React from "react";
import { IconChevron, SegmentBar, type Tone } from "@/components/assets/assets-shell-ui";
import { KpiCard } from "@/components/ui/kpi";
import { SOURCE_KIND_LABEL, type EdgeGateway, type EdgeSource } from "@/types/edge";
import {
  type EdgeIndex,
  LINK_LABEL,
  LINK_TONE,
  ago,
  countLinks,
  countReadings,
  gatewayLink,
  gatewayPoints,
  pointsOf,
  sitePath,
  sourceLink,
  sourcesOf,
} from "../edge-model";
import { IconGateway, SourceKindIcon } from "./edge-icons";
import { type Segment, linkSegments, machineName, plural, readingSegments, segmentText } from "./edge-tree-model";

/* ==========================================================================
   Pieces shared by every contents view: header, KPI card, segment legend,
   gateway and source cards (graphite cards, CLAUDE.md card style).
   ========================================================================== */

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export function ContentsHead({
  crumbs,
  title,
  badge,
  status,
  actions,
  sectionNav,
}: {
  crumbs: Crumb[];
  title: string;
  badge: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  sectionNav: React.ReactNode;
}) {
  return (
    <>
      <header className="ast-head hx-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`}>
                {c.onClick ? (
                  <button type="button" className="hx-crumb" onClick={c.onClick}>
                    {c.label}
                  </button>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.label}</span>
                )}
              </li>
            ))}
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">{title}</h1>
            <span className="hx-type-badge">{badge}</span>
            {status}
          </div>
        </div>
        {actions && <div className="pg-actions">{actions}</div>}
      </header>
      {sectionNav}
    </>
  );
}

/** KPI strip card: label, short value, caption lines. */
export function Kpi({ label, value, tone, children, aside }: { label: string; value: React.ReactNode; tone?: Tone; children?: React.ReactNode; aside?: React.ReactNode }) {
  return <KpiCard top text label={label} value={value} tone={tone} aside={aside} foot={children} footClassName="ast-kpi-foot dv-kpi-foot" />;
}

/** Segment bar + its legend; zero states are left out. */
export function SegmentSummary({ segments, legend = true }: { segments: Segment[]; legend?: boolean }) {
  const shown = segments.filter((s) => s.value > 0);
  return (
    <>
      <SegmentBar label={segmentText(segments)} segments={segments} />
      {legend && (
        <span className="hx-legend ast-num" aria-hidden="true">
          {shown.length === 0
            ? "None"
            : shown.map((s) => (
                <React.Fragment key={s.id}>
                  <i data-tone={s.tone} />
                  {s.value} {s.label.toLowerCase()}
                </React.Fragment>
              ))}
        </span>
      )}
    </>
  );
}

/** Card foot: link state dot + label, "Open". */
function LinkFoot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <div className="ast-tile-foot">
      <span className="ast-tile-status" data-tone={tone}>
        <i aria-hidden="true" />
        {label}
      </span>
      <span className="hx-open">
        Open <IconChevron size={10} />
      </span>
    </div>
  );
}

export function GatewayCard({ ix, gw, now, onOpen }: { ix: EdgeIndex; gw: EdgeGateway; now: number; onOpen: () => void }) {
  const link = gatewayLink(ix, gw);
  const tone = LINK_TONE[link.status];
  const sources = sourcesOf(ix, gw.id);
  const points = gatewayPoints(ix, gw.id);
  const broker = gw.brokerId ? ix.brokers.get(gw.brokerId) : undefined;
  const site = sitePath(ix.registry, gw.siteNodeId);
  const segments = linkSegments(countLinks(sources, (s) => sourceLink(ix, s)));
  return (
    <button
      type="button"
      className="ast-card ast-tile hx-card dv-card"
      data-disabled={!gw.enabled || undefined}
      onClick={onOpen}
      aria-label={`Open data collector ${gw.name}, ${gw.code}, ${LINK_LABEL[link.status]}, ${plural(sources.length, "device")}`}
    >
      <div className="ast-tile-top">
        <span className="ast-icon-tile" data-tone={link.status === "waiting" || link.status === "disabled" ? undefined : tone}>
          <IconGateway size={14} />
        </span>
        <span className="hx-type-tag" title="Data collector (gateway)">Data collector</span>
      </div>
      <div className="hx-card-body">
        <span className="ast-tile-name">{gw.name}</span>
        <span className="hx-card-meta ast-num">
          {gw.code}
          {gw.ipAddress ? ` · ${gw.ipAddress}` : ""}
        </span>
        <span className="hx-card-meta">
          {site ?? "No site"} · {broker ? broker.name : "No data connection"}
        </span>
      </div>
      <dl className="hx-facts">
        <div>
          <dt>Devices</dt>
          <dd className="ast-num">{sources.length}</dd>
        </div>
        <div>
          <dt>Reading points</dt>
          <dd className="ast-num">{points.length}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd className="ast-num">{ago(link.lastSeenAt, now)}</dd>
        </div>
      </dl>
      {sources.length > 0 && <SegmentBar label={`Devices: ${segmentText(segments)}`} segments={segments} />}
      <LinkFoot tone={tone} label={LINK_LABEL[link.status]} />
    </button>
  );
}

export function SourceCard({ ix, src, now, showGateway, onOpen }: { ix: EdgeIndex; src: EdgeSource; now: number; showGateway?: boolean; onOpen: () => void }) {
  const link = sourceLink(ix, src);
  const tone = LINK_TONE[link.status];
  const points = pointsOf(ix, src.id);
  const readings = countReadings(ix, points);
  const gw = ix.gateways.get(src.gatewayId);
  const machine = machineName(ix.registry, src.machineId);
  const segments = readingSegments(readings);
  const flagged = readings.alert + readings.danger;
  return (
    <button
      type="button"
      className="ast-card ast-tile hx-card dv-card"
      data-disabled={!src.enabled || undefined}
      onClick={onOpen}
      aria-label={`Open ${SOURCE_KIND_LABEL[src.kind]} ${src.code}, ${src.name}, ${LINK_LABEL[link.status]}, ${plural(points.length, "reading point")}`}
    >
      <div className="ast-tile-top">
        <span className="ast-icon-tile" data-tone={link.status === "waiting" || link.status === "disabled" ? undefined : tone}>
          <SourceKindIcon kind={src.kind} size={14} />
        </span>
        <span className="hx-type-tag">{SOURCE_KIND_LABEL[src.kind]}</span>
      </div>
      <div className="hx-card-body">
        <span className="ast-tile-name">{src.name}</span>
        <span className="hx-card-meta ast-num">
          {src.code} · {src.protocol}
          {showGateway && gw ? ` · ${gw.code}` : ""}
        </span>
        <span className="hx-card-meta">
          {src.endpoint ?? "No network address"}
          {src.machineId ? ` · ${machine ?? src.machineId}` : ""}
        </span>
      </div>
      <dl className="hx-facts">
        <div>
          <dt>Reading points</dt>
          <dd className="ast-num">{points.length}</dd>
        </div>
        <div>
          <dt>Warnings and alarms</dt>
          <dd className="ast-num pg-tone-value" data-tone={readings.danger ? "bad" : readings.alert ? "warn" : undefined}>
            {flagged === 0 ? "0" : `${readings.alert} / ${readings.danger}`}
          </dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd className="ast-num">{ago(link.lastSeenAt, now)}</dd>
        </div>
      </dl>
      {points.length > 0 && <SegmentBar label={`Reading points: ${segmentText(segments)}`} segments={segments} />}
      <LinkFoot tone={tone} label={LINK_LABEL[link.status]} />
    </button>
  );
}

