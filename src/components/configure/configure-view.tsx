"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useIndustrialData,
  type PlantRecord,
  type UserRecord,
  type RoleRecord,
  type CreatePlantInput,
  type CreateUserInput,
  type CreateMachineInput,
} from "@/providers/industrial-data-context";
import {
  Dialog,
  Field,
  FieldGrid,
  FieldSection,
  FormNote,
  KpiCard,
  KpiCards,
  NumberInput,
  PillButton,
  PillNav,
  Select,
  Table,
  TextArea,
  TextInput,
  type Column,
  type PillNavItem,
} from "@/components/ui";
import { WhyDisclosure } from "@/components/assets/analysis/an-ui";
import { conditionTone, worstCondition, type Condition } from "@/components/ui/status";
import { IconChevron, StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import type { HierarchyNode, RackChassisRecord } from "@/components/assets/assets-data";
import type { EdgeBroker, EdgeGateway, EdgeRegistry } from "@/types/edge";
import type { LinkState, MqttSnapshot } from "@/types/mqtt";
import { formatLocalTime, zoneLabel } from "@/lib/time";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "./configure.css";

/* ==========================================================================
   Configure — Enterprise 3NF Data Foundation, Multi-Plant Registry, and
   Multi-User Role-Based Access Control (RBAC).
   ========================================================================== */

type ConfigureSectionTab = "foundation" | "plants" | "users";

/* ---------------------------------------------------------------- data */

async function getData<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json().catch(() => null);
    return r.ok && j && "data" in j ? (j.data as T) : null;
  } catch {
    return null;
  }
}

interface Probe {
  ms: number | null;
  at: number;
}

function useConfigureProbe() {
  const [probe, setProbe] = useState<Probe | null>(null);
  const [registry, setRegistry] = useState<EdgeRegistry | null>(null);
  const [registryFailed, setRegistryFailed] = useState(false);
  const [mqtt, setMqtt] = useState<MqttSnapshot | null>(null);

  const run = useCallback(async () => {
    const t0 = performance.now();
    const health = await getData<unknown>("/api/health");
    const ms = health ? performance.now() - t0 : null;
    setProbe({ ms, at: Date.now() });
    const [reg, snap] = await Promise.all([getData<EdgeRegistry>("/api/edge"), getData<MqttSnapshot>("/api/mqtt/status")]);
    setRegistry(reg);
    setRegistryFailed(reg === null);
    setMqtt(snap);
  }, []);

  useEffect(() => {
    const id = setTimeout(run, 0);
    return () => clearTimeout(id);
  }, [run]);

  return { probe, registry, registryFailed, mqtt, run };
}

function latencyTone(ms: number | null | undefined): Tone {
  if (ms === null || ms === undefined) return "bad";
  if (ms < 400) return "good";
  if (ms < 1500) return "warn";
  return "bad";
}

function linkTone(state: LinkState | undefined): Tone {
  if (state === "ONLINE") return "good";
  if (state === "STALE") return "warn";
  if (state === "OFFLINE") return "bad";
  return "idle";
}

function countMachines(node: HierarchyNode): number {
  return (node.type === "machine" ? 1 : 0) + (node.children ?? []).reduce((n, c) => n + countMachines(c), 0);
}

/* ---------------------------------------------------------------- icons */

const svgProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IconDb = () => (
  <svg {...svgProps}>
    <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
    <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
  </svg>
);
const IconGateway = () => (
  <svg {...svgProps}>
    <rect x="3" y="13" width="18" height="7" rx="2" />
    <path d="M7 16.5h.01M11 16.5h.01M12 13V8M8.5 6.5a5 5 0 0 1 7 0M6 4a8.5 8.5 0 0 1 12 0" />
  </svg>
);
const IconRack = () => (
  <svg {...svgProps}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M4 9h16M4 15h16M8 6h.01M8 12h.01M8 18h.01" />
  </svg>
);
const IconPlant = () => (
  <svg {...svgProps}>
    <path d="M3 21V10l6 4V10l6 4V5h4v16zM3 21h18" />
  </svg>
);
const IconUsers = () => (
  <svg {...svgProps}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15.5 14.5c2.5.4 4.5 2 4.5 4.5" />
  </svg>
);
const IconShield = () => (
  <svg {...svgProps}>
    <path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3z" />
    <path d="M9.5 12l2 2 3.5-3.5" />
  </svg>
);
const IconCheck = () => (
  <svg {...svgProps}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
const IconWarn = () => (
  <svg {...svgProps}>
    <path d="M12 4l9 16H3zM12 10v4M12 17h.01" />
  </svg>
);

/* ---------------------------------------------------------------- checks */

interface Check {
  id: string;
  title: string;
  detail: string;
  tone: Tone;
  result: string;
  action?: { label: string; run: () => void };
}

const toneCondition = (t: Tone): Condition =>
  t === "bad" ? "Critical" : t === "warn" ? "Advisory" : t === "idle" ? "No data" : "Normal";

const RESET_TABLES =
  "roles, users, user_plant_access, plants, hierarchy_nodes, equipment_models, machines, sensor_definitions, mapped_signals, diagnosis & trend records, rack chassis, and edge gateways";

/* ---------------------------------------------------------------- view */

export function ConfigureView() {
  const {
    databaseStatus,
    isDbLive,
    reseedDatabase,
    refreshData,
    isLoading,
    hasLoaded,
    loadError,
    racks,
    // Each plant is a separate workspace: the registry shows the active account's plants only.
    machines,
    hierarchy,
    plants: allPlantRecords,
    users,
    roles,
    currentUser,
    setActiveTab,
    navigateToMachine,
    setSelectedPlantId,
    createPlant,
    updatePlant,
    deletePlant,
    createUser,
    updateUser,
    deleteUser,
    createMachine,
  } = useIndustrialData();
  const plantRecords = useMemo(() => {
    const visible = new Set(hierarchy.map((p) => p.id));
    return allPlantRecords.filter((p) => visible.has(p.id));
  }, [allPlantRecords, hierarchy]);

  const { probe, registry, registryFailed, mqtt, run: runProbe } = useConfigureProbe();
  const [sectionTab, setSectionTab] = useState<ConfigureSectionTab>("foundation");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<{ tone: Tone; text: string } | null>(null);

  // Dialog states for Plant, Machine, and User CRUD
  const [plantDialogOpen, setPlantDialogOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlantRecord | null>(null);
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const refreshAll = useCallback(async () => {
    setResult(null);
    await Promise.all([refreshData(), runProbe()]);
  }, [refreshData, runProbe]);

  const handleReset = async () => {
    setResetting(true);
    setResult({ tone: "info", text: "Resetting 3NF schema & seed data…" });
    const ok = await reseedDatabase();
    await runProbe();
    setResetting(false);
    setConfirmOpen(false);
    setResult(
      ok
        ? { tone: "good", text: `3NF Data reset · ${formatLocalTime(Date.now())}` }
        : { tone: "bad", text: "Reset unavailable. Retry." },
    );
  };

  /* ---------- derived */
  const tables = useMemo(
    () =>
      Object.entries(databaseStatus?.counts ?? {})
        .map(([name, rows]) => ({ name, rows: Number(rows) }))
        .sort((a, b) => b.rows - a.rows || a.name.localeCompare(b.name)),
    [databaseStatus],
  );
  const records = tables.reduce((n, t) => n + t.rows, 0);
  const emptyTables = tables.filter((t) => t.rows === 0);
  const maxRows = Math.max(1, ...tables.map((t) => t.rows));
  const engine = databaseStatus?.version?.split(" ").slice(0, 2).join(" ");

  const gateways = registry?.gateways ?? [];
  const brokers = useMemo<EdgeBroker[]>(() => registry?.brokers ?? [], [registry]);
  const brokerById = useMemo(() => new Map<string, EdgeBroker>(brokers.map((b) => [b.id, b])), [brokers]);
  const siteName = useMemo(() => new Map((registry?.sites ?? []).map((s) => [s.id, s.name])), [registry]);
  const gwLink = useMemo(() => {
    const m = new Map<string, LinkState>();
    for (const g of mqtt?.gateways ?? []) m.set(`${g.brokerId}|${g.gatewayId}`, g.state);
    return m;
  }, [mqtt]);
  const rackLink = useMemo(() => {
    const m = new Map<string, LinkState>();
    for (const r of mqtt?.racks ?? []) m.set(r.rackId, r.state);
    return m;
  }, [mqtt]);
  const enabledGateways = gateways.filter((g) => g.enabled);
  const onlineGateways = gateways.filter((g) => g.brokerId && gwLink.get(`${g.brokerId}|${g.code}`) === "ONLINE");

  const hierarchyPlants = useMemo(() => hierarchy.filter((n) => n.type === "plant"), [hierarchy]);
  const machineIdsWithRack = new Set(racks.map((r) => r.machineId));
  const machinesWithoutRack = machines.filter((m) => !machineIdsWithRack.has(m.id));

  const openPlant = useCallback(
    (id: string) => {
      setSelectedPlantId(id);
      setActiveTab("home");
    },
    [setSelectedPlantId, setActiveTab],
  );

  const [savingZone, setSavingZone] = useState<string | null>(null);
  const zoneOptions = useMemo(() => {
    let zones: string[] = [];
    try {
      zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      zones = [];
    }
    if (zones.length === 0) {
      zones = ["Africa/Lusaka", "Africa/Johannesburg", "UTC", "Europe/London", "Asia/Kolkata", "America/New_York"];
    }
    return zones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }));
  }, []);

  const saveZone = useCallback(
    async (id: string, timeZone: string) => {
      setSavingZone(id);
      try {
        await updatePlant(id, { timeZone });
        setResult({ tone: "good", text: `Time zone saved · ${timeZone}` });
      } catch {
        setResult({ tone: "bad", text: "Time zone unavailable. Retry." });
      } finally {
        setSavingZone(null);
      }
    },
    [updatePlant],
  );

  const checks: Check[] = [
    {
      id: "db",
      title: "3NF PostgreSQL database connection",
      detail: isDbLive
        ? `${databaseStatus?.database ?? "database"} · ${engine ?? "PostgreSQL"} · Foreign keys & B-Tree indexes active`
        : "Database unavailable. Retry.",
      tone: isDbLive ? "good" : "bad",
      result: isDbLive ? "Connected" : "Offline",
    },
    {
      id: "tables",
      title: "3NF normalized tables populated",
      detail: !tables.length
        ? "No table counts reported."
        : emptyTables.length
          ? `${emptyTables.length} of ${tables.length} tables hold no records`
          : `${tables.length} of ${tables.length} tables populated (${records.toLocaleString()} rows)`,
      tone: !tables.length ? "bad" : emptyTables.length ? "warn" : "good",
      result: !tables.length ? "No counts" : emptyTables.length ? `${emptyTables.length} empty` : `${tables.length} of ${tables.length}`,
    },
    {
      id: "plants",
      title: "Multi-plant enterprise registry",
      detail:
        plantRecords.length === 0
          ? "No plants registered"
          : `${plantRecords.length} industrial plants · ${machines.length} machines across sites`,
      tone: plantRecords.length === 0 ? "idle" : "good",
      result: `${plantRecords.length} plants`,
      action: { label: "Manage Plants", run: () => setSectionTab("plants") },
    },
    {
      id: "users",
      title: "Multi-user RBAC & site access control",
      detail:
        users.length === 0
          ? "No users loaded"
          : `${users.length} active operators across ${roles.length} RBAC roles · Active: ${currentUser?.fullName ?? "None"}`,
      tone: users.length === 0 ? "idle" : "good",
      result: `${users.length} users`,
      action: { label: "Manage Users", run: () => setSectionTab("users") },
    },
    {
      id: "racks",
      title: "Every machine has an acquisition rack",
      detail:
        machines.length === 0
          ? "No machines loaded"
          : machinesWithoutRack.length
            ? `No rack: ${machinesWithoutRack.map((m) => m.id).join(", ")}`
            : `${machines.length} of ${machines.length} machines wired to 19" Eurocard DAQ chassis`,
      tone: machines.length === 0 ? "idle" : machinesWithoutRack.length ? "warn" : "good",
      result: machines.length === 0 ? "No data" : `${machines.length - machinesWithoutRack.length} of ${machines.length}`,
    },
    {
      id: "gateways",
      title: "Edge gateways configured",
      detail: registryFailed
        ? "Edge registry unavailable"
        : `${enabledGateways.length} enabled of ${gateways.length} · ${mqtt ? `${onlineGateways.length} online` : "MQTT status unavailable"}`,
      tone: registryFailed || enabledGateways.length === 0 ? "bad" : mqtt && onlineGateways.length < enabledGateways.length ? "warn" : "good",
      result: registryFailed ? "Unavailable" : `${onlineGateways.length} of ${enabledGateways.length} online`,
      action: { label: "Open in Devices", run: () => setActiveTab("devices") },
    },
  ];
  const scored = checks.filter((c) => c.tone !== "idle");
  const passed = scored.filter((c) => c.tone === "good").length;
  const overallCondition: Condition = !hasLoaded ? "No data" : worstCondition(scored.map((c) => toneCondition(c.tone)));
  const overallTone: Tone = conditionTone(overallCondition);
  const overallLabel = !hasLoaded
    ? "Checking…"
    : overallCondition === "Normal"
      ? "Normal"
      : `${scored.length - passed} of ${scored.length} checks ${overallCondition.toLowerCase()}`;

  const sectionTabs: PillNavItem<ConfigureSectionTab>[] = [
    { id: "foundation", label: "Data Foundation & 3NF Schema" },
    { id: "plants", label: `Plants & Sites (${plantRecords.length})` },
    { id: "users", label: `Users & RBAC (${users.length})` },
  ];

  /* ---------- columns */
  const gatewayColumns: Column<EdgeGateway>[] = [
    {
      key: "gw",
      header: "Gateway",
      render: (g) => (
        <span className="pg-cfg-lead">
          <span className="ast-badge" data-tone={linkTone(g.brokerId ? gwLink.get(`${g.brokerId}|${g.code}`) : undefined)}>
            <IconGateway />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{g.code}</span>
            <span className="ast-cell-sub">{g.siteNodeId ? siteName.get(g.siteNodeId) ?? g.siteNodeId : "No site assigned"}</span>
          </span>
        </span>
      ),
    },
    {
      key: "broker",
      header: "Broker",
      render: (g) => <span className="ast-cell-text">{g.brokerId ? brokerById.get(g.brokerId)?.name ?? "Unknown" : "None"}</span>,
    },
    {
      key: "link",
      header: "Link",
      width: "130px",
      render: (g) => {
        if (!g.enabled) return <StatusTag tone="idle" label="Disabled" />;
        const s = g.brokerId ? gwLink.get(`${g.brokerId}|${g.code}`) : undefined;
        return <StatusTag tone={linkTone(s)} label={s ? s.charAt(0) + s.slice(1).toLowerCase() : mqtt ? "Not seen" : "Unknown"} />;
      },
    },
    { key: "go", header: "", width: "28px", render: () => <span className="pg-chev"><IconChevron /></span> },
  ];

  const rackColumns: Column<RackChassisRecord>[] = [
    {
      key: "rack",
      header: "Rack",
      render: (r) => (
        <span className="pg-cfg-lead">
          <span className="ast-badge" data-tone={linkTone(rackLink.get(r.primaryRack.rackId))}>
            <IconRack />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{r.primaryRack.rackId}</span>
            <span className="ast-cell-sub">{r.machineId}</span>
          </span>
        </span>
      ),
    },
    { key: "ip", header: "Address", render: (r) => <span className="ast-num">{r.primaryRack.ipAddress || "—"}</span> },
    { key: "slots", header: "Slots", width: "70px", render: (r) => <span className="ast-num">{r.slots.length}</span> },
    { key: "go", header: "", width: "28px", render: () => <span className="pg-chev"><IconChevron /></span> },
  ];

  const plantHierarchyColumns: Column<HierarchyNode>[] = [
    {
      key: "plant",
      header: "Plant",
      render: (p) => (
        <span className="pg-cfg-lead">
          <span className="ast-badge">
            <IconPlant />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{p.name}</span>
            <span className="ast-cell-sub ast-num">
              {countMachines(p)} machine{countMachines(p) === 1 ? "" : "s"}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "tz",
      header: "Time zone",
      render: (p) =>
        p.timeZone ? (
          <span className="ast-cell-text ast-num">{zoneLabel(p.timeZone)}</span>
        ) : (
          <span className="pg-cfg-tz" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Select
              id={`tz-${p.id}`}
              value=""
              disabled={savingZone === p.id}
              onChange={(v) => v && void saveZone(p.id, v)}
              options={[{ value: "", label: savingZone === p.id ? "Saving…" : "Not set · choose zone" }, ...zoneOptions]}
            />
          </span>
        ),
    },
    { key: "go", header: "", width: "28px", render: () => <span className="pg-chev"><IconChevron /></span> },
  ];

  const plantRecordColumns: Column<PlantRecord>[] = [
    {
      key: "plant",
      header: "Plant / Site",
      render: (p) => (
        <span className="pg-cfg-lead">
          <span className="ast-badge" data-tone={p.status === "Operational" ? "good" : "warn"}>
            <IconPlant />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{p.name}</span>
            <span className="ast-cell-sub ast-num">
              {p.code} · {p.region} · {p.location}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "manager",
      header: "Plant Director",
      render: (p) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{p.managerName || "Unassigned"}</span>
          <span className="ast-cell-sub">{p.designCapacity || p.timeZone}</span>
        </span>
      ),
    },
    {
      key: "machines",
      header: "Assets",
      width: "120px",
      render: (p) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title ast-num">{p.machineCount} machines</span>
          <span className="ast-cell-sub ast-num">{p.areaCount} areas · {p.userCount} users</span>
        </span>
      ),
    },
    {
      key: "health",
      header: "Health",
      width: "100px",
      render: (p) => (
        <span className="ast-num" style={{ fontWeight: 500 }}>
          {p.averageHealth}%
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (p) => (
        <StatusTag
          tone={p.status === "Operational" ? "good" : p.status === "Advisory" ? "warn" : "idle"}
          label={p.status}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      width: "160px",
      render: (p) => (
        <span
          style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end", width: "100%" }}
          onClick={(e) => e.stopPropagation()}
        >
          <PillButton
            variant="secondary"
            onClick={() => {
              setEditingPlant(p);
              setPlantDialogOpen(true);
            }}
          >
            Edit
          </PillButton>
          <PillButton variant="secondary" onClick={() => openPlant(p.id)}>
            Open
          </PillButton>
        </span>
      ),
    },
  ];

  const userColumns: Column<UserRecord>[] = [
    {
      key: "user",
      header: "Operator / Engineer",
      render: (u) => {
        return (
          <span className="pg-cfg-lead">
            <span
              className="ast-badge"
              data-tone={u.status === "Active" ? "good" : u.status === "On Call" ? "warn" : "idle"}
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {u.avatarInitials}
            </span>
            <span className="ast-cell-stack">
              <span className="ast-cell-title">
                {u.fullName} {u.id === currentUser?.id && <span className="ast-caption">(Active Session)</span>}
              </span>
              <span className="ast-cell-sub">
                {u.title} · {u.email}
              </span>
            </span>
          </span>
        );
      },
    },
    {
      key: "role",
      header: "RBAC Role",
      render: (u) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">{u.role.name}</span>
          <span className="ast-cell-sub">{u.department} · {u.shift}</span>
        </span>
      ),
    },
    {
      key: "plants",
      header: "Plant Access (M:N)",
      render: (u) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title">
            {u.plantAccess.length > 0
              ? u.plantAccess.map((a) => `${a.plantCode} (${a.accessLevel})`).join(" · ")
              : "All plants (no access rows)"}
          </span>
          <span className="ast-cell-sub">
            {[
              u.role.canManageUsers && "Users",
              u.role.canManagePlants && "Plants",
              u.role.canManageMachines && "Machines",
              u.role.canManageEdge && "Edge",
              u.role.canManageWorkOrders && "Work Orders",
              u.role.canAckAlerts && "Ack Alerts",
            ]
              .filter(Boolean)
              .join(" · ") || "Read-only observer"}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (u) => (
        <StatusTag
          tone={u.status === "Active" ? "good" : u.status === "On Call" ? "warn" : "idle"}
          label={u.status}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      width: "190px",
      render: (u) => {
        return (
          <span
            style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <PillButton
              variant="secondary"
              onClick={() => {
                setEditingUser(u);
                setUserDialogOpen(true);
              }}
            >
              Edit
            </PillButton>
          </span>
        );
      },
    },
  ];

  const roleColumns: Column<RoleRecord>[] = [
    {
      key: "role",
      header: "Role",
      render: (r) => (
        <span className="pg-cfg-lead">
          <span className="ast-badge" data-tone={r.canManageUsers || r.canManagePlants ? "good" : "info"}>
            <IconShield />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title">{r.name}</span>
            <span className="ast-cell-sub">{r.description}</span>
          </span>
        </span>
      ),
    },
    {
      key: "perms",
      header: "Permissions Matrix",
      width: "320px",
      render: (r) => (
        <span className="ast-cell-text ast-num">
          {[
            r.canManageUsers ? "Users ✓" : null,
            r.canManagePlants ? "Plants ✓" : null,
            r.canManageMachines ? "Machines ✓" : null,
            r.canManageEdge ? "Edge ✓" : null,
            r.canManageWorkOrders ? "Work Orders ✓" : null,
            r.canAckAlerts ? "Alerts ✓" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Read-Only Observer"}
        </span>
      ),
    },
  ];

  /* ---------- render */
  const latencyMs = probe?.ms ?? null;

  return (
    <div className="pg-root ast-root pg-cfg-root" aria-label="Configure">
      <header className="ast-head pg-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>Configure</li>
            <li>Enterprise 3NF & Access Control</li>
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">Enterprise Configuration</h1>
            <StatusTag tone={overallTone} label={overallLabel} />
          </div>
          <p className="pg-cfg-context ast-num">
            {probe ? `Checked ${formatLocalTime(probe.at)}` : "Checking…"}
            {currentUser ? ` · Active operator: ${currentUser.fullName} (${currentUser.role.name})` : ""}
          </p>
        </div>
        <div className="pg-actions">
          {result && (
            <span className="pg-note" data-tone={result.tone} role="status">
              {result.text}
            </span>
          )}
          <PillButton variant="secondary" onClick={refreshAll} disabled={isLoading || resetting}>
            {isLoading ? "Checking…" : "Refresh"}
          </PillButton>
        </div>
      </header>

      {/* Horizontal Pill Navigation for Configure Sections */}
      <PillNav
        items={sectionTabs}
        activeId={sectionTab}
        onChange={setSectionTab}
        ariaLabel="Configuration sections"
      />

      {loadError && (
        <div className="ast-card pg-note" data-tone="bad" role="alert">
          Configuration data unavailable. Retry.
        </div>
      )}

      {/* ---------- KPI strip */}
      <KpiCards label="Key figures">
        <KpiCard
          top
          label="3NF Database"
          aside={
            <span className="ast-icon-tile" data-tone={isDbLive ? "good" : "bad"}>
              <IconDb />
            </span>
          }
          value={!hasLoaded ? "Checking…" : isDbLive ? "Connected" : "Offline"}
          tone={isDbLive ? "good" : "bad"}
          footClassName="ast-kpi-foot pg-cfg-kpi-sub ast-num"
          foot={tables.length ? `${records.toLocaleString()} rows · ${tables.length} normalized tables` : "No counts"}
        />
        <KpiCard
          label="Industrial Plants"
          aside={
            <span className="ast-icon-tile" data-tone="good">
              <IconPlant />
            </span>
          }
          value={plantRecords.length}
          unit={`sites · ${machines.length} machines`}
          tone="good"
          footClassName="ast-kpi-foot pg-cfg-kpi-sub ast-num"
          foot={plantRecords.map((p) => p.code).join(" · ") || "Multi-plant hierarchy"}
        />
        <KpiCard
          label="Operators & RBAC"
          aside={
            <span className="ast-icon-tile" data-tone="good">
              <IconUsers />
            </span>
          }
          value={users.length}
          unit={`users · ${roles.length} roles`}
          tone="good"
          footClassName="ast-kpi-foot pg-cfg-kpi-sub ast-num"
          foot={currentUser ? `Session: ${currentUser.fullName}` : "Role-based plant scoping"}
        />
        <KpiCard
          label="Acquisition Racks & Edge"
          aside={
            <span className="ast-icon-tile">
              <IconRack />
            </span>
          }
          value={racks.length}
          unit={`/ ${machines.length} machines`}
          tone={machines.length && machinesWithoutRack.length ? "warn" : undefined}
          footClassName="ast-kpi-foot pg-cfg-kpi-sub ast-num"
          foot={`${enabledGateways.length} edge gateways · ${brokers.length} brokers`}
        />
      </KpiCards>

      {/* ====================================================================
          TAB 1: DATA FOUNDATION & 3NF SCHEMA
         ==================================================================== */}
      {sectionTab === "foundation" && (
        <>
          <section className="ast-card pg-table-card" aria-label="Configuration checks">
            <div className="ast-card-head">
              <h2 className="ast-card-title">
                Configuration checks
                <span className="ast-caption ast-num">
                  {passed} / {scored.length} normal
                </span>
              </h2>
            </div>
            <ul className="pg-cfg-checks">
              {checks.map((c) => (
                <li key={c.id} className="pg-cfg-check">
                  <span className="ast-badge" data-tone={c.tone}>
                    {c.tone === "good" ? <IconCheck /> : <IconWarn />}
                  </span>
                  <span className="pg-cfg-check-text">
                    <span className="pg-cfg-check-title">{c.title}</span>
                    <span className="pg-cfg-check-detail">{c.detail}</span>
                  </span>
                  <StatusTag tone={conditionTone(toneCondition(c.tone))} label={c.result} />
                  {c.action && (
                    <PillButton variant="secondary" onClick={c.action.run}>
                      {c.action.label}
                    </PillButton>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section id="cfg-plant-settings" className="ast-card pg-table-card" aria-label="Plant settings">
            <div className="ast-card-head">
              <h2 className="ast-card-title">
                Plant time zones
                <span className="ast-caption">Timestamps for a plant&apos;s equipment use its local time zone</span>
              </h2>
              <PillButton variant="secondary" onClick={() => setSectionTab("plants")}>
                Manage Plants & Assets
              </PillButton>
            </div>
            {hierarchyPlants.length ? (
              <Table
                className="ast-table"
                columns={plantHierarchyColumns}
                data={hierarchyPlants}
                keyExtractor={(p) => p.id}
                onRowClick={(p) => openPlant(p.id)}
              />
            ) : (
              <div className="ast-empty">{hasLoaded ? "No plants in the hierarchy." : "Loading plants…"}</div>
            )}
          </section>

          <div className="pg-cfg-grid">
            <section className="ast-card pg-table-card" aria-label="Edge gateways">
              <div className="ast-card-head">
                <h2 className="ast-card-title">
                  Edge gateways
                  <span className="ast-caption ast-num">
                    {enabledGateways.length} enabled · {brokers.length} broker{brokers.length === 1 ? "" : "s"}
                  </span>
                </h2>
                <PillButton variant="secondary" onClick={() => setActiveTab("devices")}>
                  Open in Devices
                </PillButton>
              </div>
              {gateways.length ? (
                <Table
                  className="ast-table"
                  columns={gatewayColumns}
                  data={gateways}
                  keyExtractor={(g) => g.id}
                  onRowClick={() => setActiveTab("devices")}
                />
              ) : (
                <div className="ast-empty">
                  {registryFailed ? "Edge registry unavailable. Retry." : registry ? "No gateways configured." : "Loading gateways…"}
                </div>
              )}
            </section>

            <section className="ast-card pg-table-card" aria-label="Acquisition racks">
              <div className="ast-card-head">
                <h2 className="ast-card-title">
                  Acquisition racks
                  <span className="ast-caption ast-num">
                    {racks.length} of {machines.length} machines
                  </span>
                </h2>
              </div>
              {racks.length ? (
                <Table
                  className="ast-table"
                  columns={rackColumns}
                  data={racks}
                  keyExtractor={(r) => r.primaryRack.rackId}
                  onRowClick={(r) => navigateToMachine(r.machineId, "rack")}
                />
              ) : (
                <div className="ast-empty">{hasLoaded ? "No acquisition racks configured." : "Loading racks…"}</div>
              )}
            </section>
          </div>

          <section className="ast-card" aria-label="Database">
            <div className="ast-card-head">
              <h2 className="ast-card-title">
                3NF PostgreSQL Schema & Table Telemetry
                {tables.length > 0 && (
                  <span className="ast-caption ast-num">
                    {records.toLocaleString()} records · {tables.length} normalized tables
                  </span>
                )}
              </h2>
            </div>
            <WhyDisclosure summary="Records per 3NF table and health check">
              <dl className="pg-cfg-db-facts ast-num">
                <div>
                  <dt>Database</dt>
                  <dd>{[databaseStatus?.database, engine].filter(Boolean).join(" · ") || "Not reported"}</dd>
                </div>
                <div>
                  <dt>Normalization</dt>
                  <dd>Strict 3NF · Foreign Keys (CASCADE / SET NULL) · B-Tree Composite Indexes</dd>
                </div>
                <div>
                  <dt>Health-check round-trip</dt>
                  <dd data-tone={probe ? latencyTone(latencyMs) : undefined}>
                    {probe ? (latencyMs === null ? "No reply" : `${Math.round(latencyMs).toLocaleString()} ms`) : "—"}
                  </dd>
                </div>
              </dl>
              {tables.length ? (
                <>
                  <ul className="pg-cfg-bars">
                    {tables.map((t) => (
                      <li key={t.name} className="pg-cfg-bar" data-tone={t.rows === 0 ? "warn" : undefined}>
                        <span className="pg-cfg-bar-name ast-num" title={t.name}>
                          {t.name}
                        </span>
                        <span className="pg-cfg-bar-track" aria-hidden="true">
                          <span
                            className="pg-cfg-bar-fill"
                            style={{ width: `${t.rows === 0 ? 0 : Math.max(1, (t.rows / maxRows) * 100)}%` }}
                          />
                        </span>
                        <span className="pg-cfg-bar-value ast-num">
                          {t.rows === 0 ? "empty" : t.rows.toLocaleString()}
                          {t.rows > 0 && <span className="ast-unit">rows</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="pg-cfg-scale">
                    Linear scale, longest bar = {maxRows.toLocaleString()} rows. `sensor_definitions` stores canonical engineering sensor specs once per tag while `mapped_signals` links each machine channel by foreign key.
                  </p>
                </>
              ) : (
                <div className="ast-empty">{isDbLive ? "No table counts reported." : "Database offline."}</div>
              )}
            </WhyDisclosure>
          </section>

          <section className="ast-card pg-cfg-reset" aria-label="Reset demo data">
            <div className="pg-cfg-check-text">
              <span className="pg-cfg-check-title">Reset 3NF demo data</span>
              <span className="pg-cfg-check-detail">
                Clears every table and rebuilds the 3 plants, 6 users, 5 roles, 13 machines, and edge registry from the canonical seed set.
              </span>
            </div>
            <PillButton variant="danger" onClick={() => setConfirmOpen(true)} disabled={isLoading || resetting || !isDbLive}>
              Reset demo data…
            </PillButton>
          </section>
        </>
      )}

      {/* ====================================================================
          TAB 2: PLANTS & SITES MANAGEMENT
         ==================================================================== */}
      {sectionTab === "plants" && (
        <>
          <section className="ast-card pg-table-card" aria-label="Registered Industrial Plants">
            <div className="ast-card-head">
              <h2 className="ast-card-title">
                Industrial Plants & Sites
                <span className="ast-caption ast-num">
                  {plantRecords.length} plants · {machines.length} total machines
                </span>
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <PillButton
                  variant="secondary"
                  onClick={() => setMachineDialogOpen(true)}
                >
                  + Commission Machine
                </PillButton>
                <PillButton
                  variant="primary"
                  onClick={() => {
                    setEditingPlant(null);
                    setPlantDialogOpen(true);
                  }}
                >
                  + Add Plant
                </PillButton>
              </div>
            </div>
            {plantRecords.length ? (
              <Table
                className="ast-table"
                columns={plantRecordColumns}
                data={plantRecords}
                keyExtractor={(p) => p.id}
                onRowClick={(p) => openPlant(p.id)}
              />
            ) : (
              <div className="ast-empty">No plants registered.</div>
            )}
          </section>
        </>
      )}

      {/* ====================================================================
          TAB 3: USERS & RBAC ACCESS CONTROL
         ==================================================================== */}
      {sectionTab === "users" && (
        <>
          <section className="ast-card pg-table-card" aria-label="Users and Operators">
            <div className="ast-card-head">
              <h2 className="ast-card-title">
                Users & Multi-Plant Access Control
                <span className="ast-caption ast-num">
                  {users.length} users · Click &ldquo;Switch to&rdquo; to preview plant scoping in the top bar
                </span>
              </h2>
              <PillButton
                variant="primary"
                onClick={() => {
                  setEditingUser(null);
                  setUserDialogOpen(true);
                }}
              >
                + Add User
              </PillButton>
            </div>
            {users.length ? (
              <Table
                className="ast-table"
                columns={userColumns}
                data={users}
                keyExtractor={(u) => u.id}
                onRowClick={(u) => {
                  setEditingUser(u);
                  setUserDialogOpen(true);
                }}
              />
            ) : (
              <div className="ast-empty">No users registered.</div>
            )}
          </section>

          <section className="ast-card pg-table-card" aria-label="RBAC Roles">
            <div className="ast-card-head">
              <h2 className="ast-card-title">
                Normalized RBAC Roles (`roles` table)
                <span className="ast-caption ast-num">{roles.length} roles</span>
              </h2>
            </div>
            <Table className="ast-table" columns={roleColumns} data={roles} keyExtractor={(r) => r.id} />
          </section>
        </>
      )}

      {/* ---------- Dialog: Reset Demo Data */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset 3NF demo data"
        subtitle={databaseStatus?.database ? `Database ${databaseStatus.database}` : undefined}
        busy={resetting}
        width={500}
        footer={
          <>
            <PillButton variant="secondary" onClick={() => setConfirmOpen(false)} disabled={resetting}>
              Cancel
            </PillButton>
            <PillButton variant="danger" onClick={handleReset} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset demo data"}
            </PillButton>
          </>
        }
      >
        <p className="pg-cfg-dialog-text">
          Every table is cleared and rebuilt from the 3NF seed set. Custom changes made in the console are replaced, including:
        </p>
        <p className="pg-cfg-dialog-text pg-cfg-check-detail">{RESET_TABLES}.</p>
        <ul className="pg-cfg-dialog-list ast-num">
          <li>
            {records.toLocaleString()} rows across {tables.length} core 3NF tables now
          </li>
          <li>
            {gateways.length} gateway{gateways.length === 1 ? "" : "s"}, {brokers.length} broker{brokers.length === 1 ? "" : "s"}
          </li>
          <li>The MQTT runtime reloads; live links drop briefly.</li>
        </ul>
      </Dialog>

      {/* ---------- Dialog: Add / Edit Plant */}
      <PlantDialog
        open={plantDialogOpen}
        plant={editingPlant}
        users={users}
        zoneOptions={zoneOptions}
        onClose={() => setPlantDialogOpen(false)}
        onSave={async (input, existingId) => {
          if (existingId) {
            await updatePlant(existingId, input);
            setResult({ tone: "good", text: `Updated plant ${input.name}` });
          } else {
            const created = await createPlant(input);
            setResult({ tone: "good", text: `Created plant ${created.code} · ${created.name}` });
          }
          setPlantDialogOpen(false);
        }}
        onDelete={
          editingPlant && editingPlant.id !== "plant-kln"
            ? async (id) => {
                await deletePlant(id);
                setResult({ tone: "good", text: `Deleted plant ${id}` });
                setPlantDialogOpen(false);
              }
            : undefined
        }
      />

      {/* ---------- Dialog: Commission New Machine */}
      <MachineDialog
        open={machineDialogOpen}
        plants={plantRecords}
        onClose={() => setMachineDialogOpen(false)}
        onSave={async (input) => {
          const created = await createMachine(input);
          setResult({ tone: "good", text: `Commissioned machine ${created.id} (${created.name})` });
          setMachineDialogOpen(false);
        }}
      />

      {/* ---------- Dialog: Add / Edit User */}
      <UserDialog
        open={userDialogOpen}
        user={editingUser}
        roles={roles}
        plants={plantRecords}
        onClose={() => setUserDialogOpen(false)}
        onSave={async (input, existingId) => {
          if (existingId) {
            await updateUser(existingId, input);
            setResult({ tone: "good", text: `Updated user ${input.fullName}` });
          } else {
            const created = await createUser(input);
            setResult({ tone: "good", text: `Created user ${created.fullName}` });
          }
          setUserDialogOpen(false);
        }}
        onDelete={
          editingUser && editingUser.id !== "usr-swastik"
            ? async (id) => {
                await deleteUser(id);
                setResult({ tone: "good", text: `Removed user ${id}` });
                setUserDialogOpen(false);
              }
            : undefined
        }
      />
    </div>
  );
}

/* ==========================================================================
   Modal Dialogs for Plant, Machine, and User CRUD
   ========================================================================== */

function PlantDialog({
  open,
  plant,
  users,
  zoneOptions,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  plant: PlantRecord | null;
  users: UserRecord[];
  zoneOptions: { value: string; label: string }[];
  onClose: () => void;
  onSave: (input: CreatePlantInput, existingId?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [region, setRegion] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [timeZone, setTimeZone] = useState("Africa/Lusaka");
  const [status, setStatus] = useState<"Operational" | "Advisory" | "Standby" | "Maintenance">("Operational");
  const [managerUserId, setManagerUserId] = useState("");
  const [designCapacity, setDesignCapacity] = useState("");
  const [commissionedYear, setCommissionedYear] = useState("2024");
  const [description, setDescription] = useState("");
  const [initialAreas, setInitialAreas] = useState("Primary Grinding & Classification, Leaching & Utilities");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (plant) {
      setCode(plant.code);
      setName(plant.name);
      setShortName(plant.shortName);
      setRegion(plant.region);
      setLocation(plant.location);
      setCoordinates(plant.coordinates);
      setTimeZone(plant.timeZone);
      setStatus(plant.status);
      setManagerUserId(plant.managerUserId ?? "");
      setDesignCapacity(plant.designCapacity ?? "");
      setCommissionedYear(plant.commissionedYear ? String(plant.commissionedYear) : "2022");
      setDescription(plant.description ?? "");
    } else {
      setCode("MIN-LUM-04");
      setName("Lumwana Super-Pit Comminution Plant");
      setShortName("Lumwana Concentrator");
      setRegion("North-Western Copperbelt");
      setLocation("Solwezi West Mining District, Zambia");
      setCoordinates("12°14'18\"S 25°51'42\"E");
      setTimeZone("Africa/Lusaka");
      setStatus("Operational");
      setManagerUserId(users[0]?.id ?? "");
      setDesignCapacity("60,000 t/d Copper Ore");
      setCommissionedYear("2024");
      setDescription("Primary gyratory crushing, twin overland conveyors, and dual ball mill grinding circuit.");
      setInitialAreas("Primary Crushing Area, Milling & Classification Area");
    }
  }, [open, plant, users]);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onSave(
        {
          code,
          name,
          shortName,
          region,
          location,
          coordinates,
          timeZone,
          status,
          managerUserId: managerUserId || null,
          designCapacity,
          commissionedYear: Number(commissionedYear) || 2024,
          description,
          initialAreas: initialAreas
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
        plant?.id,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save plant");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={plant ? `Edit Plant · ${plant.code}` : "Register New Industrial Plant"}
      subtitle="Normalized 3NF plant record with automatic hierarchy tree & RBAC provisioning"
      busy={busy}
      width={620}
      footer={
        <>
          {onDelete && plant && (
            <PillButton
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDelete(plant.id);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Delete failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete Plant
            </PillButton>
          )}
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : plant ? "Save Changes" : "Create Plant"}
          </PillButton>
        </>
      }
    >
      {err && <FormNote tone="bad">{err}</FormNote>}
      <FieldGrid>
        <Field label="Plant Code" required>
          {(id) => <TextInput id={id} value={code} onChange={setCode} mono placeholder="MIN-LUM-04" />}
        </Field>
        <Field label="Short Name" required>
          {(id) => <TextInput id={id} value={shortName} onChange={setShortName} placeholder="Lumwana Concentrator" />}
        </Field>
        <Field label="Full Plant Name" wide required>
          {(id) => <TextInput id={id} value={name} onChange={setName} placeholder="Lumwana Super-Pit Comminution Plant" />}
        </Field>
        <Field label="Region">
          {(id) => <TextInput id={id} value={region} onChange={setRegion} />}
        </Field>
        <Field label="Location / Complex">
          {(id) => <TextInput id={id} value={location} onChange={setLocation} />}
        </Field>
        <Field label="Coordinates">
          {(id) => <TextInput id={id} value={coordinates} onChange={setCoordinates} mono />}
        </Field>
        <Field label="Time Zone">
          {(id) => <Select id={id} value={timeZone} onChange={setTimeZone} options={zoneOptions} />}
        </Field>
        <Field label="Plant Director">
          {(id) => (
            <Select
              id={id}
              value={managerUserId}
              onChange={setManagerUserId}
              options={[
                { value: "", label: "Unassigned" },
                ...users.map((u) => ({ value: u.id, label: `${u.fullName} (${u.role.name})` })),
              ]}
            />
          )}
        </Field>
        <Field label="Operational Status">
          {(id) => (
            <Select
              id={id}
              value={status}
              onChange={(v) => setStatus(v as typeof status)}
              options={[
                { value: "Operational", label: "Operational" },
                { value: "Advisory", label: "Advisory" },
                { value: "Standby", label: "Standby" },
                { value: "Maintenance", label: "Maintenance" },
              ]}
            />
          )}
        </Field>
        <Field label="Design Capacity">
          {(id) => <TextInput id={id} value={designCapacity} onChange={setDesignCapacity} />}
        </Field>
        <Field label="Commissioned Year">
          {(id) => <NumberInput id={id} value={commissionedYear} onChange={setCommissionedYear} min={1950} max={2050} />}
        </Field>
        {!plant && (
          <Field label="Initial Process Areas (comma-separated)" wide>
            {(id) => <TextInput id={id} value={initialAreas} onChange={setInitialAreas} />}
          </Field>
        )}
        <Field label="Plant Description" wide>
          {(id) => <TextArea id={id} value={description} onChange={setDescription} rows={2} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

function MachineDialog({
  open,
  plants,
  onClose,
  onSave,
}: {
  open: boolean;
  plants: PlantRecord[];
  onClose: () => void;
  onSave: (input: CreateMachineInput) => Promise<void>;
}) {
  const [id, setId] = useState("PUMP-205");
  const [name, setName] = useState("Thickener Underflow Slurry Pump #5");
  const [plantId, setPlantId] = useState(plants[0]?.id ?? "plant-conc");
  const [areaName, setAreaName] = useState("Concentrate Dewatering & Thickening");
  const [type, setType] = useState("Centrifugal Slurry Pump");
  const [manufacturer, setManufacturer] = useState("Weir Minerals");
  const [model, setModel] = useState("Warman MCR 250");
  const [serialNumber, setSerialNumber] = useState("WM-MCR250-2024-88");
  const [powerRating, setPowerRating] = useState("630 kW");
  const [operatingSpeed, setOperatingSpeed] = useState("590 RPM");
  const [diagramType, setDiagramType] = useState<"pump" | "mill" | "crusher" | "blower" | "kiln">("pump");
  const [criticality, setCriticality] = useState<"A (Critical)" | "B (Essential)" | "C (General)">("A (Critical)");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && plants.length > 0 && !plantId) {
      setPlantId(plants[0].id);
    }
    setErr(null);
  }, [open, plants, plantId]);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onSave({
        id,
        name,
        plantId,
        areaName,
        type,
        manufacturer,
        model,
        serialNumber,
        powerRating,
        operatingSpeed,
        diagramType,
        criticality,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to commission machine");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Commission New Machine Asset"
      subtitle="Creates normalized equipment_models, machines, sap_equipment_records, machine_systems, and initial sensors"
      busy={busy}
      width={620}
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Commissioning…" : "Commission Machine"}
          </PillButton>
        </>
      }
    >
      {err && <FormNote tone="bad">{err}</FormNote>}
      <FieldGrid>
        <Field label="Machine Tag ID" required>
          {(fid) => <TextInput id={fid} value={id} onChange={setId} mono placeholder="PUMP-205" />}
        </Field>
        <Field label="Plant" required>
          {(fid) => (
            <Select
              id={fid}
              value={plantId}
              onChange={setPlantId}
              options={plants.map((p) => ({ value: p.id, label: `${p.code} · ${p.shortName}` }))}
            />
          )}
        </Field>
        <Field label="Machine Name" wide required>
          {(fid) => <TextInput id={fid} value={name} onChange={setName} />}
        </Field>
        <Field label="Process Area Name">
          {(fid) => <TextInput id={fid} value={areaName} onChange={setAreaName} />}
        </Field>
        <Field label="Schematic Diagram Archetype">
          {(fid) => (
            <Select
              id={fid}
              value={diagramType}
              onChange={(v) => setDiagramType(v as typeof diagramType)}
              options={[
                { value: "pump", label: "Centrifugal / Slurry Pump" },
                { value: "mill", label: "SAG / Ball Grinding Mill" },
                { value: "crusher", label: "Gyratory Crusher / Conveyor" },
                { value: "blower", label: "Centrifugal Blower / Agitator" },
                { value: "kiln", label: "Rotary Kiln Pyro Line" },
              ]}
            />
          )}
        </Field>
        <Field label="Equipment Type">
          {(fid) => <TextInput id={fid} value={type} onChange={setType} />}
        </Field>
        <Field label="OEM Manufacturer">
          {(fid) => <TextInput id={fid} value={manufacturer} onChange={setManufacturer} />}
        </Field>
        <Field label="OEM Model Number">
          {(fid) => <TextInput id={fid} value={model} onChange={setModel} />}
        </Field>
        <Field label="Serial Number">
          {(fid) => <TextInput id={fid} value={serialNumber} onChange={setSerialNumber} mono />}
        </Field>
        <Field label="Power Rating">
          {(fid) => <TextInput id={fid} value={powerRating} onChange={setPowerRating} />}
        </Field>
        <Field label="Operating Speed">
          {(fid) => <TextInput id={fid} value={operatingSpeed} onChange={setOperatingSpeed} />}
        </Field>
        <Field label="ISO Criticality Class">
          {(fid) => (
            <Select
              id={fid}
              value={criticality}
              onChange={(v) => setCriticality(v as typeof criticality)}
              options={[
                { value: "A (Critical)", label: "A (Critical)" },
                { value: "B (Essential)", label: "B (Essential)" },
                { value: "C (General)", label: "C (General)" },
              ]}
            />
          )}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

function UserDialog({
  open,
  user,
  roles,
  plants,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  user: UserRecord | null;
  roles: RoleRecord[];
  plants: PlantRecord[];
  onClose: () => void;
  onSave: (input: CreateUserInput, existingId?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [shift, setShift] = useState("Day Shift (06:00–18:00)");
  const [roleId, setRoleId] = useState("role-reliability");
  const [status, setStatus] = useState<"Active" | "On Call" | "Away" | "Inactive">("Active");
  const [selectedPlants, setSelectedPlants] = useState<Record<string, "admin" | "write" | "read" | "none">>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setTitle(user.title);
      setDepartment(user.department);
      setPhone(user.phone ?? "");
      setShift(user.shift);
      setRoleId(user.roleId);
      setStatus(user.status);
      const map: Record<string, "admin" | "write" | "read" | "none"> = {};
      for (const p of plants) map[p.id] = "none";
      for (const a of user.plantAccess) map[a.plantId] = a.accessLevel;
      setSelectedPlants(map);
    } else {
      setFullName("");
      setEmail("");
      setTitle("Senior Vibration Analyst");
      setDepartment("Condition Monitoring");
      setPhone("+260 97 800 5500");
      setShift("Day Shift (06:00–18:00)");
      setRoleId(roles[2]?.id ?? "role-reliability");
      setStatus("Active");
      const map: Record<string, "admin" | "write" | "read" | "none"> = {};
      for (const [idx, p] of plants.entries()) map[p.id] = idx === 0 ? "write" : "none";
      setSelectedPlants(map);
    }
  }, [open, user, plants, roles]);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const plantAssignments = Object.entries(selectedPlants)
        .filter(([, level]) => level !== "none")
        .map(([plantId, level], idx) => ({
          plantId,
          accessLevel: level as "admin" | "write" | "read",
          isPrimary: idx === 0,
        }));
      await onSave(
        {
          fullName,
          email,
          title,
          department,
          phone,
          shift,
          roleId,
          status,
          defaultPlantId: plantAssignments[0]?.plantId ?? null,
          plantAssignments,
        },
        user?.id,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save user");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={user ? `Edit Operator · ${user.fullName}` : "Add Operator / Engineer"}
      subtitle="Assign role-based permissions and M:N plant access (`user_plant_access`)"
      busy={busy}
      width={620}
      footer={
        <>
          {onDelete && user && (
            <PillButton
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDelete(user.id);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Delete failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete User
            </PillButton>
          )}
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : user ? "Save Changes" : "Create User"}
          </PillButton>
        </>
      }
    >
      {err && <FormNote tone="bad">{err}</FormNote>}
      <FieldGrid>
        <Field label="Full Name" required>
          {(id) => <TextInput id={id} value={fullName} onChange={setFullName} placeholder="Mulenga Phiri" />}
        </Field>
        <Field label="Email Address" required>
          {(id) => <TextInput id={id} value={email} onChange={setEmail} placeholder="mulenga.phiri@ultron.industrial" />}
        </Field>
        <Field label="RBAC Role" required>
          {(id) => (
            <Select
              id={id}
              value={roleId}
              onChange={setRoleId}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
            />
          )}
        </Field>
        <Field label="Status">
          {(id) => (
            <Select
              id={id}
              value={status}
              onChange={(v) => setStatus(v as typeof status)}
              options={[
                { value: "Active", label: "Active" },
                { value: "On Call", label: "On Call" },
                { value: "Away", label: "Away" },
                { value: "Inactive", label: "Inactive" },
              ]}
            />
          )}
        </Field>
        <Field label="Job Title">
          {(id) => <TextInput id={id} value={title} onChange={setTitle} />}
        </Field>
        <Field label="Department">
          {(id) => <TextInput id={id} value={department} onChange={setDepartment} />}
        </Field>
        <Field label="Phone">
          {(id) => <TextInput id={id} value={phone} onChange={setPhone} />}
        </Field>
        <Field label="Shift">
          {(id) => <TextInput id={id} value={shift} onChange={setShift} />}
        </Field>
      </FieldGrid>

      <FieldSection title="Plant Access Assignments (`user_plant_access`)">
        <FieldGrid>
          {plants.map((p) => (
            <Field key={p.id} label={`${p.code} · ${p.shortName}`}>
              {(id) => (
                <Select
                  id={id}
                  value={selectedPlants[p.id] ?? "none"}
                  onChange={(v) =>
                    setSelectedPlants((prev) => ({
                      ...prev,
                      [p.id]: v as "admin" | "write" | "read" | "none",
                    }))
                  }
                  options={[
                    { value: "none", label: "No Access" },
                    { value: "read", label: "Read-Only Observer" },
                    { value: "write", label: "Write / Reliability Operator" },
                    { value: "admin", label: "Plant Administrator" },
                  ]}
                />
              )}
            </Field>
          ))}
        </FieldGrid>
      </FieldSection>
    </Dialog>
  );
}
