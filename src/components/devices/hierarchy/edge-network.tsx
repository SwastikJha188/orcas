"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { SearchPill, StatusTag } from "@/components/assets/assets-shell-ui";
import type { EdgeGateway } from "@/types/edge";
import {
  type DiscoveredGateway,
  type EdgeIndex,
  LINK_TONE,
  ago,
  countLinks,
  gatewayLink,
  gatewayTone,
  sourcesOf,
  worstTone,
} from "../edge-model";
import { IconGateway, IconNetwork, IconPlus } from "./edge-icons";
import { ContentsHead, GatewayCard, SegmentSummary, SourceCard } from "./edge-parts";
import {
  type Selection,
  gatewayMatches,
  linkSegments,
  plural,
  sortGateways,
  sortSources,
  sourceMatches,
} from "./edge-tree-model";

/* ==========================================================================
   Edge network root: what the selected plant is wired through. Summary strip
   (gateways online · brokers connected), then gateway or source cards.
   ========================================================================== */

type Filter = "all" | "gateways" | "sources";

export interface EdgeNetworkProps {
  ix: EdgeIndex;
  gateways: EdgeGateway[];
  discovered: DiscoveredGateway[];
  plantLabel: string;
  now: number;
  sectionNav: React.ReactNode;
  onSelect: (sel: Selection) => void;
  onConnect: () => void;
  onAddManual: () => void;
}

export function EdgeNetwork({ ix, gateways, discovered, plantLabel, now, sectionNav, onSelect, onConnect, onAddManual }: EdgeNetworkProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const q = query.trim().toLowerCase();

  const sources = useMemo(() => sortSources(gateways.flatMap((g) => sourcesOf(ix, g.id))), [ix, gateways]);

  const gwLinks = countLinks(gateways, (g) => gatewayLink(ix, g));
  const brokers = ix.registry.brokers;
  const connected = brokers.filter((b) => ix.brokerState.get(b.id)?.state === "connected").length;
  const enabledBrokers = brokers.filter((b) => b.enabled).length;

  const shownGateways = useMemo(
    () => sortGateways(gateways).filter((g) => gatewayMatches(g, q) || sourcesOf(ix, g.id).some((s) => sourceMatches(ix, s, q))),
    [ix, gateways, q],
  );
  const shownSources = useMemo(() => sources.filter((s) => sourceMatches(ix, s, q)), [ix, sources, q]);

  const silent = gwLinks.waiting + gwLinks.disabled === gateways.length;
  const tone = gateways.length === 0 ? "idle" : worstTone(...gateways.map((g) => gatewayTone(ix, g)));
  const showGateways = filter !== "sources" && shownGateways.length > 0;
  const showSources = filter !== "gateways" && shownSources.length > 0;

  return (
    <>
      <ContentsHead
        crumbs={[{ label: "Devices" }, { label: plantLabel }]}
        title="Data collectors and devices"
        badge={
          <>
            <IconNetwork size={12} />
            Network root
          </>
        }
        status={
          gateways.length > 0 && (
            <StatusTag tone={silent ? "idle" : tone} label={silent ? "No live data" : `${gwLinks.online} of ${gateways.length} online`} />
          )
        }
        actions={
          <>
            <PillButton variant="secondary" onClick={onAddManual}>
              Add manually
            </PillButton>
            <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={onConnect}>
              Connect gateway
            </PillButton>
          </>
        }
        sectionNav={sectionNav}
      />

      {gateways.length === 0 ? (
        <div className="ast-card ast-empty">
          <strong className="hx-empty-title">No data collectors{plantLabel === "All plants" ? "" : ` in ${plantLabel}`}</strong>
          Connect the data collector (gateway) that sends this plant&rsquo;s sensor readings to a data connection (MQTT broker). Its devices and sensor cards are found from the first data it sends.
          <PillButton variant="secondary" icon={<IconPlus size={13} />} onClick={onConnect}>
            Connect a data collector
          </PillButton>
        </div>
      ) : (
        <>
          <div className="dv-summary" aria-label="Summary">
            <div className="hx-stat">
              <span className="hx-stat-label">Gateways online</span>
              <span className="hx-stat-value ast-num">
                {gwLinks.online}
                <span className="ast-unit">/ {gateways.length}</span>
              </span>
              <SegmentSummary segments={linkSegments(gwLinks)} />
            </div>
            <div className="hx-stat">
              <span className="hx-stat-label">Data connections working</span>
              <span className="hx-stat-value ast-num">
                {connected}
                <span className="ast-unit">/ {brokers.length}</span>
              </span>
              <span className="hx-legend ast-num">
                {brokers.length === 0 ? "None set up" : `${enabledBrokers} on · ${brokers.length - enabledBrokers} off`}
              </span>
            </div>
          </div>

          <div className="hx-toolbar">
            <SearchPill value={query} onChange={setQuery} placeholder="Search collectors, devices, sensors" label="Search data collectors, devices and sensor tags" />
            <PillNav
              items={[
                { id: "all", label: `All ${gateways.length + sources.length}` },
                { id: "gateways", label: `Data collectors ${gateways.length}` },
                { id: "sources", label: `Devices ${sources.length}` },
              ]}
              activeId={filter}
              onChange={(id) => setFilter(id as Filter)}
            />
          </div>

          {!showGateways && !showSources ? (
            <div className="ast-card ast-empty">
              <strong className="hx-empty-title">No match</strong>
              {q ? `Nothing here matches “${query.trim()}”.` : "Nothing at this level for this filter."}
              <PillButton
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Reset filters
              </PillButton>
            </div>
          ) : (
            <>
              {showGateways && (
                <section className="hx-section" aria-label="Data collectors">
                  <h2 className="ast-section-label">
                    Gateways<span>{shownGateways.length}</span>
                  </h2>
                  <div className="hx-grid">
                    {shownGateways.map((g) => (
                      <GatewayCard key={g.id} ix={ix} gw={g} now={now} onOpen={() => onSelect({ type: "gateway", id: g.id })} />
                    ))}
                  </div>
                </section>
              )}
              {showSources && (
                <section className="hx-section" aria-label="Devices">
                  <h2 className="ast-section-label">
                    Sources<span>{shownSources.length}</span>
                  </h2>
                  <div className="hx-grid">
                    {shownSources.map((s) => (
                      <SourceCard key={s.id} ix={ix} src={s} now={now} showGateway onOpen={() => onSelect({ type: "source", id: s.id })} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {discovered.length > 0 && filter !== "sources" && (
        <section className="hx-section" aria-label="Data collectors found but not registered">
          <h2 className="ast-section-label">
            Discovered<span>{discovered.length} publishing, not registered</span>
          </h2>
          <div className="hx-grid">
            {discovered.map((d) => {
              const broker = ix.brokers.get(d.brokerId);
              const t = LINK_TONE[d.state === "ONLINE" ? "online" : d.state === "STALE" ? "stale" : "offline"];
              return (
                <button
                  key={`${d.brokerId}/${d.gatewayId}`}
                  type="button"
                  className="ast-card ast-tile hx-card dv-card"
                  onClick={() => onSelect({ type: "discovered", brokerId: d.brokerId, gatewayId: d.gatewayId })}
                  aria-label={`Open data collector ${d.gatewayId}, found but not registered, ${plural(d.rackIds.length, "device")} reported`}
                >
                  <div className="ast-tile-top">
                    <span className="ast-icon-tile" data-tone={t}>
                      <IconGateway size={14} />
                    </span>
                    <span className="dv-new">New</span>
                  </div>
                  <div className="hx-card-body">
                    <span className="ast-tile-name">{d.gatewayId}</span>
                    <span className="hx-card-meta ast-num">
                      {d.ip || "No IP"} · {broker?.name ?? d.brokerId}
                    </span>
                    <span className="hx-card-meta ast-num">
                      {plural(d.rackIds.length, "rack")} reported · seen {ago(d.lastSeenAt, now)}
                    </span>
                  </div>
                  <div className="ast-tile-foot">
                    <span className="ast-tile-status" data-tone="info">
                      <i aria-hidden="true" />
                      Not registered
                    </span>
                    <span className="hx-open">Register</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
