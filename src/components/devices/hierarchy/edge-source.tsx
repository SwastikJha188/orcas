"use client";

import React, { useMemo, useState } from "react";
import { FormNote, PillButton, PillNav, Table, type Column } from "@/components/ui";
import { IconSensor, Spark, StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { isKilnMachine, useKilnSimulationFor } from "@/providers/kiln-simulation-context";
import { sendMqttCommand } from "@/providers/use-mqtt-live";
import type { LiveSignal } from "@/lib/kiln-sim/engine";
import { SOURCE_KIND_LABEL, type EdgePoint, type EdgeSource } from "@/types/edge";
import {
  type EdgeIndex,
  type PointReading,
  LINK_LABEL,
  LINK_TONE,
  READING_LABEL,
  READING_TONE,
  ago,
  liveRack,
  pointReading,
  pointsOf,
  sourceLink,
} from "../edge-model";
import { ChannelTable } from "./edge-channels";
import { sourceCards } from "./edge-detect";
import type { MapTarget } from "./edge-map-dialog";
import { IconEdit, IconPlus, SourceKindIcon } from "./edge-icons";
import { ContentsHead, Kpi } from "./edge-parts";
import { type Selection, fmt, limitText, machineName, plural, sortPoints } from "./edge-tree-model";

/* ==========================================================================
   Source (DAQ rack · PLC · SCADA · DCS · analyser): protocol · machine ·
   link · points strip, the point table, and channels it publishes that no
   point maps. KLN-01 points with no MQTT reading show the running simulation,
   labelled "Simulated" — never as an MQTT value.
   ========================================================================== */

const SIM_TONE: Record<LiveSignal["status"], Tone> = {
  Normal: "good",
  Advisory: "warn",
  Critical: "bad",
};

interface PointRow {
  point: EdgePoint;
  reading: PointReading;
  sim: LiveSignal | null;
}

export interface PointPrefill {
  slot: string;
  channel: string;
  name: string;
  unit: string | null;
  alertLimit: number | null;
  dangerLimit: number | null;
}

const ALL_CARDS = "\u0000all";

export interface EdgeSourceViewProps {
  ix: EdgeIndex;
  src: EdgeSource;
  now: number;
  history: Record<string, number[]>;
  sectionNav: React.ReactNode;
  onSelect: (sel: Selection) => void;
  onEdit: () => void;
  onAddPoint: (prefill?: PointPrefill) => void;
  onEditPoint: (point: EdgePoint) => void;
  onMap: (t: MapTarget) => void;
  onAddCard: () => void;
}

export function EdgeSourceView({ ix, src, now, history, sectionNav, onSelect, onEdit, onAddPoint, onEditPoint, onMap, onAddCard }: EdgeSourceViewProps) {
  const { navigateToMachine } = useIndustrialData();
  const gw = ix.gateways.get(src.gatewayId);
  const points = useMemo(() => sortPoints(pointsOf(ix, src.id)), [ix, src.id]);
  const kilnMachine = isKilnMachine(src.machineId) ? src.machineId : (points.find((p) => isKilnMachine(p.machineId))?.machineId ?? null);
  // Subscribes only for kiln sources (re-renders every second while it does).
  const sim = useKilnSimulationFor(kilnMachine);
  const [cardFilter, setCardFilter] = useState(ALL_CARDS);
  const [ping, setPing] = useState<{
    busy: boolean;
    tone: "good" | "bad";
    text: string;
  } | null>(null);

  const link = sourceLink(ix, src);
  const rack = liveRack(ix, src);
  const machine = machineName(ix.registry, src.machineId);
  const machineKnown = Boolean(src.machineId && machine);
  const cards = sourceCards(ix, src);
  const activeCard = cards.some((c) => c.id === cardFilter) ? cardFilter : ALL_CARDS;
  const unmapped = cards.flatMap((c) => c.channels).filter((ch) => !ch.point && (activeCard === ALL_CARDS || ch.card === activeCard));

  const rows: PointRow[] = points
    .filter((p) => activeCard === ALL_CARDS || p.slot === activeCard)
    .map((point) => {
      const reading = pointReading(ix, point);
      const signal =
        reading.status === "nodata" && sim && point.signalTag && isKilnMachine(point.machineId) ? (sim.frame.signals[point.signalTag] ?? null) : null;
      return {
        point,
        reading,
        sim: signal && signal.value !== null ? signal : null,
      };
    });
  const flagged = {
    alert: points.filter((p) => pointReading(ix, p).status === "alert").length,
    danger: points.filter((p) => pointReading(ix, p).status === "danger").length,
  };
  const simulated = rows.filter((r) => r.sim).length;

  // Ping goes to the broker the rack is heard on; only when it is connected and allows PING.
  const brokerId = rack?.brokerId ?? gw?.brokerId ?? null;
  const brokerLive = brokerId ? ix.brokerState.get(brokerId) : undefined;
  const canPing = Boolean(gw && brokerLive?.state === "connected" && brokerLive.allowedCommands.includes("PING"));

  const doPing = async () => {
    if (!gw) return;
    setPing({ busy: true, tone: "good", text: `Pinging ${src.code}…` });
    try {
      const res = await sendMqttCommand(gw.code, src.code, "PING", brokerId ?? undefined);
      const ok = /^(accepted|completed)$/i.test(res.response.status);
      setPing({
        busy: false,
        tone: ok ? "good" : "bad",
        text: `${src.code} answered ${res.response.status}${res.response.message ? ` · ${res.response.message}` : ""} in ${fmt(res.roundTripMs)} ms`,
      });
    } catch (err) {
      setPing({ busy: false, tone: "bad", text: (err as Error).message });
    }
  };

  const cardNav =
    cards.length > 0 ? (
      <PillNav
        className="dv-cardnav"
        wrap
        items={[
          { id: ALL_CARDS, label: `All cards ${cards.length}` },
          ...cards.map((c) => ({
            id: c.id,
            label: `Card ${c.id} · ${c.channels.length} ch${c.isNew ? " · new" : ""}`,
          })),
        ]}
        activeId={activeCard}
        onChange={setCardFilter}
      />
    ) : null;

  const columns: Column<PointRow>[] = [
    {
      key: "point",
      header: "Point",
      render: ({ point, reading, sim: s }) => {
        const tone = s ? SIM_TONE[s.status] : READING_TONE[reading.status];
        return (
          <span className="dv-lead" data-disabled={!point.enabled || undefined}>
            <span className="ast-badge" data-tone={tone === "idle" ? undefined : tone}>
              <IconSensor size={14} />
            </span>
            <span className="ast-cell-stack">
              <span className="ast-cell-title">{point.tag}</span>
              <span className="ast-cell-sub">{point.name}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "pos",
      header: "Card · Ch",
      render: ({ point }) => (
        <span className="ast-cell-stack">
          <span className="ast-num">
            {point.slot} · {point.channel}
          </span>
          <span className="ast-cell-sub ast-num">{point.address ?? "No address"}</span>
        </span>
      ),
    },
    {
      key: "value",
      header: "Value",
      render: ({ point, reading, sim: s }) => {
        if (s) {
          return (
            <span className="dv-value ast-num pg-tone-value" data-tone={s.status === "Normal" ? undefined : SIM_TONE[s.status]}>
              {s.display}
              <span className="ast-unit">{point.unit ?? ""}</span>
            </span>
          );
        }
        if (reading.value === null && !reading.display) return <span className="ast-muted">—</span>;
        const tone = reading.status === "alert" ? "warn" : reading.status === "danger" ? "bad" : undefined;
        return (
          <span className="dv-value ast-num pg-tone-value" data-tone={tone}>
            {reading.display ?? fmt(reading.value)}
            <span className="ast-unit">{reading.unit ?? ""}</span>
          </span>
        );
      },
    },
    {
      key: "trend",
      header: "Trend",
      render: ({ point, reading }) => {
        const values = reading.measurement ? (history[reading.measurement.key] ?? []) : [];
        if (values.length < 2) return <span className="ast-muted">—</span>;
        return (
          <span className="dv-trend">
            <Spark
              values={values}
              unit={reading.unit ?? point.unit ?? ""}
              height={28}
              tone={READING_TONE[reading.status] === "idle" ? "info" : READING_TONE[reading.status]}
              ariaLabel={`${point.tag} recent values`}
            />
          </span>
        );
      },
    },
    {
      key: "limits",
      header: "Alert / danger",
      render: ({ point }) => {
        const t = limitText(point);
        return t ? (
          <span className="ast-num">
            {t}
            <span className="ast-unit">{point.unit ?? ""}</span>
          </span>
        ) : (
          <span className="ast-muted">Not set</span>
        );
      },
    },
    {
      key: "mapped",
      header: "Mapped to",
      render: ({ point }) =>
        point.machineId ? (
          <span className="dv-chip ast-num">
            {point.machineId} · {point.signalTag ?? point.tag}
          </span>
        ) : (
          <span className="ast-muted">No machine</span>
        ),
    },
    {
      key: "state",
      header: "State",
      render: ({ reading, sim: s }) =>
        s ? <StatusTag tone="info" label="Simulated" /> : <StatusTag tone={READING_TONE[reading.status]} label={READING_LABEL[reading.status]} />,
    },
    {
      key: "updated",
      header: "Updated",
      render: ({ reading }) => <span className="ast-num ast-muted">{ago(reading.updatedAt, now)}</span>,
    },
    {
      key: "edit",
      header: "",
      width: "1%",
      render: ({ point }) => (
        <span className="dv-action">
          <button
            type="button"
            className="ast-icon-btn dv-reveal"
            aria-label={`Edit point ${point.tag}`}
            title="Edit point"
            onClick={(e) => {
              e.stopPropagation();
              onEditPoint(point);
            }}
          >
            <IconEdit size={14} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <>
      <ContentsHead
        crumbs={[
          { label: "Devices" },
          {
            label: "Edge network",
            onClick: () => onSelect({ type: "network" }),
          },
          ...(gw
            ? [
                {
                  label: gw.code,
                  onClick: () => onSelect({ type: "gateway", id: gw.id }),
                },
              ]
            : []),
          { label: src.code },
        ]}
        title={src.name}
        badge={
          <>
            <SourceKindIcon kind={src.kind} size={12} />
            {SOURCE_KIND_LABEL[src.kind]}
          </>
        }
        status={<StatusTag tone={LINK_TONE[link.status]} label={LINK_LABEL[link.status]} />}
        actions={
          <>
            {canPing && (
              <PillButton variant="secondary" onClick={doPing} disabled={ping?.busy} aria-label={`Ping ${src.code} through ${gw?.code}`}>
                {ping?.busy ? "Pinging…" : "Ping"}
              </PillButton>
            )}
            <PillButton variant="secondary" icon={<IconEdit size={13} />} onClick={onEdit}>
              Edit source
            </PillButton>
            <PillButton variant="secondary" icon={<IconPlus size={13} />} onClick={onAddCard}>
              Add card
            </PillButton>
            <PillButton variant="primary" icon={<IconPlus size={13} />} onClick={() => onAddPoint()}>
              Add point
            </PillButton>
          </>
        }
        sectionNav={sectionNav}
      />

      {ping && !ping.busy && <FormNote tone={ping.tone}>{ping.text}</FormNote>}

      <section className="ast-kpis" aria-label="Source status">
        <Kpi label="Protocol" value={src.protocol}>
          <span className="ast-caption dv-wrap">{src.endpoint ?? "No endpoint"}</span>
          <span className="ast-caption ast-num">
            {src.pollIntervalMs !== null ? `Poll every ${fmt(src.pollIntervalMs)} ms` : "Poll interval not set"}
            {src.model ? ` · ${src.model}` : ""}
          </span>
        </Kpi>
        <Kpi
          label="Machine"
          value={src.machineId ? (machine ?? src.machineId) : "Not linked"}
          aside={
            machineKnown && (
              <button type="button" className="dv-link" onClick={() => navigateToMachine(src.machineId!)} aria-label={`Open machine ${machine}`}>
                Open
              </button>
            )
          }
        >
          <span className="ast-caption ast-num">{src.machineId ?? "Points can still map to machines one by one"}</span>
          {src.location && <span className="ast-caption">{src.location}</span>}
        </Kpi>
        <Kpi label="Link" value={LINK_LABEL[link.status]} tone={link.status === "waiting" || link.status === "disabled" ? undefined : LINK_TONE[link.status]}>
          {rack ? (
            <>
              <span className="ast-caption ast-num">
                Last seen {ago(rack.lastSeenAt, now)} · {plural(cards.length, "card")}
              </span>
              <span className="ast-caption pg-note" data-tone={rack.dataCurrent ? undefined : "warn"}>
                {rack.dataCurrent ? `Data current · ${rack.status}` : (rack.reason ?? "Data not current")}
              </span>
            </>
          ) : (
            <span className="ast-caption">{link.reason ?? "Nothing published yet"}</span>
          )}
        </Kpi>
      </section>

      {/* No points yet: the channels below are the content; Add point stays in the header. */}
      {points.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Points">
          <div className="ast-card-head dv-table-head">
            <h2 className="ast-card-title">
              Points <span className="ast-caption ast-num">{rows.length === points.length ? points.length : `${rows.length} of ${points.length}`}</span>
              {(flagged.alert > 0 || flagged.danger > 0) && (
                <span className="ast-caption ast-num">
                  {" · "}
                  <span className="pg-tone-value" data-tone={flagged.alert ? "warn" : undefined}>
                    {flagged.alert} alert
                  </span>
                  {" · "}
                  <span className="pg-tone-value" data-tone={flagged.danger ? "bad" : undefined}>
                    {flagged.danger} danger
                  </span>
                </span>
              )}
              {simulated > 0 && <span className="ast-caption ast-num">{` · ${simulated} simulated`}</span>}
            </h2>
            {cardNav}
          </div>
          <Table className="ast-table dv-points" columns={columns} data={rows} keyExtractor={(r) => r.point.id} onRowClick={(r) => onEditPoint(r.point)} />
        </section>
      )}

      {unmapped.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Unmapped channels">
          <div className="ast-card-head dv-table-head">
            <h2 className="ast-card-title">
              Unmapped channels
              <span className="ast-caption ast-num">
                {plural(unmapped.length, "channel")} published with no point
                {activeCard === ALL_CARDS ? "" : ` on card ${activeCard}`}
              </span>
            </h2>
            {points.length === 0 && cardNav}
          </div>
          {gw && <ChannelTable gw={gw} channels={unmapped} history={history} now={now} onMap={onMap} />}
        </section>
      )}
    </>
  );
}
