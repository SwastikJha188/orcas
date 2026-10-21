"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useIndustrialData,
  type PlantRecord,
  type UserRecord,
  type RoleRecord,
  type CreatePlantInput,
  type CreateUserInput,
  type CreateMachineInput,
  type UpdatePlantInput,
  type UpdateUserInput,
} from "@/providers/industrial-data-context";
import {
  ConfirmAction,
  Dialog,
  Field,
  FieldGrid,
  FieldSection,
  FormNote,
  NumberInput,
  PillButton,
  Select,
  Table,
  TextArea,
  TextInput,
  type Column,
} from "@/components/ui";
import { IconChevron, StatusTag, type Tone } from "@/components/assets/assets-shell-ui";
import type { HierarchyNode } from "@/components/assets/assets-data";
import { DIAGRAM_SHEETS } from "@/components/assets/diagrams";
import { MoreFields } from "@/components/ui/more-fields";
import type { AssetMachine } from "@shared/types/assets";
import type { OnboardingStatus } from "@shared/types/onboarding";
import { invalidateApi, useApi } from "@/lib/api-cache";
import { formatLocalTime } from "@/lib/time";
import { OnboardingPanel } from "./onboarding/onboarding-panel";
import { SupportSection, useSupportTickets } from "./support-section";
import { PhotoPicker, attachDraftPhotos, discardDraftPhotos, type DrawingState } from "./photo-picker";
import "@/components/assets/assets-shell.css";
import "@/components/ui/page.css";
import "@/components/home/plant-home.css";
import "@/components/home/operator/operator-console.css";
import "./configure.css";

/* ==========================================================================
   Configure — the one place things are set up (modelled on the ULTRON
   console's Configure studio): a step list on the left, the chosen section on
   the right. Monitoring stays on the monitoring pages; gateways and
   racks stay on Devices; simulation stays on Simulation. Only what builds or
   sets up the plant lives here:

     Plants & machines    what each plant contains, its local time
     Add from documents   onboarding: read a plant's PDFs and photos
     Users & access       who signs in, which plants they open
     Monitoring settings  how readings are saved and checked (system_settings)
   ========================================================================== */

const CONFIGURE_SECTIONS = ["plants", "onboarding", "users", "monitoring", "support"] as const;
type ConfigureSection = (typeof CONFIGURE_SECTIONS)[number];

const SECTION_META: Record<ConfigureSection, { label: string; blurb: string; Icon: () => React.JSX.Element }> = {
  plants: {
    label: "Plants & machines",
    blurb: "Add plants and the machines in them, and set each plant's local time.",
    Icon: () => <IconPlant />,
  },
  onboarding: {
    label: "Add from documents",
    blurb: "Read a new plant's documents and machine photos, check what was read, then create the plant.",
    Icon: () => <IconDoc />,
  },
  users: {
    label: "Users & access",
    blurb: "Who can sign in, which plants they can open and what they may change.",
    Icon: () => <IconUsers />,
  },
  monitoring: {
    label: "Monitoring settings",
    blurb: "How often readings are saved and checked, and how long they are kept. A change applies within a minute.",
    Icon: () => <IconSliders />,
  },
  support: {
    label: "Support",
    blurb: "Ask the Oswar Teck support team for help, and follow each answer.",
    Icon: () => <IconSupport />,
  },

};

const SECTION_KEY = "ultron.configure.section";

/** "1 area", "6 machines". */
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

interface SettingRow {
  key: string;
  value: number;
  unit: string | null;
  description: string;
  updatedAt: string;
}

/** Settings are grouped by the first part of their key; groups not listed here show after these. */
const SETTING_GROUPS: Array<{ prefix: string; label: string }> = [
  { prefix: "readings", label: "Readings" },
  { prefix: "evaluation", label: "Checking readings" },
  { prefix: "reference", label: "Normal ranges learned from readings" },
  { prefix: "health", label: "Machine health history" },
  { prefix: "auth", label: "Sign-in" },
];

/** Unit shown after a setting's value ("count" is a plain number, so nothing). */
const settingUnit = (u: string | null) => (u && u !== "count" ? u : "");

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

const IconPlant = () => (
  <svg {...svgProps}>
    <path d="M3 21V10l5 3V10l5 3V6l8 4v11H3zM7 17h2M12 17h2M17 17h1" />
  </svg>
);
const IconMachine = () => (
  <svg {...svgProps}>
    <rect x="3" y="7" width="13" height="10" rx="2" />
    <path d="M16 10h3l2 2v3h-5M6 20h7M8 17v3M11 17v3" />
  </svg>
);
const IconUsers = () => (
  <svg {...svgProps}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M17 14c2.4 0 4 1.8 4 4.5" />
  </svg>
);
const IconShield = () => (
  <svg {...svgProps}>
    <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
  </svg>
);
const IconDoc = () => (
  <svg {...svgProps}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);
const IconSupport = () => (
  <svg {...svgProps}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8 9h8M8 12h5" />
  </svg>
);
const IconSliders = () => (
  <svg {...svgProps}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);


/** The viewer's own IANA time zone (the form's starting value for a new plant). */
function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/* ---------------------------------------------------------------- view */

export function ConfigureView() {
  const {
    refreshData,
    hasLoaded,
    loadError,
    // Each plant is a separate workspace: the registry shows the active account's plants only.
    machines,
    hierarchy,
    plants: allPlantRecords,
    users,
    roles,
    currentUser,
    navigateToMachine,
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

  // What the signed-in account may change (the server checks the same rules).
  const superAdmin = Boolean(currentUser?.role.allPlants);
  // Support: plant people raise tickets; the Oswar super administrator answers them.
  const canRaiseTickets = Boolean(currentUser?.role.canRaiseTickets);
  const showSupport = canRaiseTickets || superAdmin;
  const tickets = useSupportTickets();
  const openTickets = (tickets.data ?? []).filter((t) => t.status === "open").length;
  const [raiseOpen, setRaiseOpen] = useState(false);
  const visibleSections = CONFIGURE_SECTIONS.filter((id) => id !== "support" || showSupport);
  const myPlantLevel = useMemo(
    () => new Map((currentUser?.plantAccess ?? []).map((a) => [a.plantId, a.accessLevel])),
    [currentUser],
  );
  const canAddUsers = Boolean(currentUser?.role.canManageUsers);
  const canAddPlants = Boolean(currentUser?.role.canManagePlants);
  // Monitoring settings and onboarding follow the server's administer rule (plant managers).
  const canAdminister = superAdmin || canAddPlants;
  const canEditPlant = (plantId: string) =>
    superAdmin || myPlantLevel.get(plantId) === "admin" || (canAddPlants && myPlantLevel.has(plantId));
  const canDeletePlant = (plantId: string) => superAdmin || (canAddPlants && myPlantLevel.get(plantId) === "admin");
  const canEditUser = (u: UserRecord) =>
    superAdmin ||
    u.id === currentUser?.id ||
    (canAddUsers && !u.role.allPlants && u.plantAccess.length > 0 && u.plantAccess.every((a) => myPlantLevel.has(a.plantId)));
  // People of this account's plants; the super administrator sees everyone.
  const scopedUsers = useMemo(() => {
    if (superAdmin) return users;
    const visible = new Set(plantRecords.map((p) => p.id));
    return users.filter((u) => u.id === currentUser?.id || (!u.role.allPlants && u.plantAccess.some((a) => visible.has(a.plantId))));
  }, [superAdmin, users, plantRecords, currentUser]);
  const assignableRoles = useMemo(() => (superAdmin ? roles : roles.filter((r) => !r.allPlants)), [superAdmin, roles]);
  const assignablePlants = useMemo(
    () => (superAdmin ? plantRecords : plantRecords.filter((p) => myPlantLevel.has(p.id))),
    [superAdmin, plantRecords, myPlantLevel],
  );

  /* ---------- section (remembered per viewer) */
  const [section, setSectionState] = useState<ConfigureSection>("plants");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SECTION_KEY);
      if (saved && (CONFIGURE_SECTIONS as readonly string[]).includes(saved)) setSectionState(saved as ConfigureSection);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const [result, setResult] = useState<{ tone: Tone; text: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // On a narrow screen the section pills scroll sideways: keep the chosen one in view.
  useEffect(() => {
    document.querySelector<HTMLElement>(".cfg-topbar .opc-pill-btn[data-active]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [section]);
  const setSection = useCallback((s: ConfigureSection) => {
    setSectionState(s);
    setResult(null);
    // A new section starts at its top (the bars above never scroll).
    bodyRef.current?.scrollTo({ top: 0 });
    try {
      localStorage.setItem(SECTION_KEY, s);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const settings = useApi<SettingRow[]>("/api/settings");
  const onboardings = useApi<Array<{ id: string; status: OnboardingStatus }>>(canAdminister ? "/api/onboarding" : null, {
    // Reads finish in the background: the step list catches up on the 30 s display beat.
    refreshMs: 30_000,
  });


  // Dialog states for Plant, Machine, and User CRUD
  const [plantDialogOpen, setPlantDialogOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlantRecord | null>(null);
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  // A machine is added inside its plant: the plant the machine dialog is for.
  const [machinePlant, setMachinePlant] = useState<PlantRecord | null>(null);
  const machinePlantAreas = useMemo(() => {
    const out: Array<{ id: string; name: string }> = [];
    const walk = (n: HierarchyNode, path: string) => {
      for (const c of n.children ?? [])
        if (c.type === "area") {
          const name = path ? `${path} › ${c.name}` : c.name;
          out.push({ id: c.id, name });
          walk(c, name);
        }
    };
    const root = hierarchy.find((h) => h.id === machinePlant?.id);
    if (root) walk(root, "");
    return out;
  }, [hierarchy, machinePlant]);
  const openAddMachine = useCallback((p: PlantRecord) => {
    setMachinePlant(p);
    setMachineDialogOpen(true);
  }, []);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);


  /* ---------- plants & machines */
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const plantId = selectedPlantId && plantRecords.some((p) => p.id === selectedPlantId) ? selectedPlantId : (plantRecords[0]?.id ?? null);
  const selectedPlant = plantRecords.find((p) => p.id === plantId) ?? null;
  const zoneById = useMemo(() => new Map(hierarchy.map((h) => [h.id, h.timeZone ?? null])), [hierarchy]);
  const plantMachines = useMemo(
    () =>
      machines
        .filter((m) => m.plantId === plantId)
        .sort((a, b) => a.id.localeCompare(b.id)),
    [machines, plantId],
  );
  // The selected plant's areas ("Line › Section" for nested ones) and each machine's nearest area, from the hierarchy.
  const { plantAreas, areaOfMachine } = useMemo(() => {
    const areas: Array<{ id: string; name: string }> = [];
    const byMachine = new Map<string, string>();
    const walk = (n: HierarchyNode, path: string, area: string | null) => {
      for (const c of n.children ?? []) {
        if (c.type === "area") {
          const name = path ? `${path} › ${c.name}` : c.name;
          areas.push({ id: c.id, name });
          walk(c, name, c.id);
        } else if (c.type === "machine" && c.machineId) {
          if (area) byMachine.set(c.machineId, area);
        } else walk(c, path, area);
      }
    };
    const root = hierarchy.find((h) => h.id === plantId);
    if (root) walk(root, "", null);
    return { plantAreas: areas, areaOfMachine: byMachine };
  }, [hierarchy, plantId]);
  const plantsWithoutZone = plantRecords.filter((p) => !zoneById.get(p.id)).length;

  const zoneOptions = useMemo(() => {
    let zones: string[] = [];
    try {
      zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      zones = [];
    }
    // Runtimes without the zone list still offer the viewer's own zone and UTC.
    if (zones.length === 0) zones = [...new Set([browserTimeZone(), "UTC"])];
    return zones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }));
  }, []);

  /** One plant field saved from its cell; the error (if any) is shown on the cell and in the header. */
  const savePlant = useCallback(
    async (p: PlantRecord, patch: UpdatePlantInput, what: string) => {
      try {
        await updatePlant(p.id, patch);
        setResult({ tone: "good", text: `${p.name}: ${what} saved` });
      } catch (e) {
        setResult({ tone: "bad", text: `${p.name}: ${what} not saved. ${(e as Error).message}` });
        throw e;
      }
    },
    [updatePlant],
  );
  /** One machine field saved from its cell (PATCH /api/machines/:id), then the plant data reloads. */
  const saveMachine = useCallback(
    async (m: AssetMachine, patch: { name?: string; areaId?: string; criticality?: AssetMachine["criticality"] }, what: string) => {
      try {
        const r = await fetch(`/api/machines/${encodeURIComponent(m.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const j = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
        if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`);
        await refreshData();
        setResult({ tone: "good", text: `${m.name}: ${what} saved` });
      } catch (e) {
        setResult({ tone: "bad", text: `${m.name}: ${what} not saved. ${(e as Error).message}` });
        throw e;
      }
    },
    [refreshData],
  );
  /** One user field saved from its cell (PATCH /api/users/:id; the server re-checks who may change it). */
  const saveUser = useCallback(
    async (u: UserRecord, patch: UpdateUserInput, what: string) => {
      try {
        await updateUser(u.id, patch);
        setResult({ tone: "good", text: `${u.fullName}: ${what} saved` });
      } catch (e) {
        setResult({ tone: "bad", text: `${u.fullName}: ${what} not saved. ${(e as Error).message}` });
        throw e;
      }
    },
    [updateUser],
  );
  const managerOptions = useMemo(
    () => [{ value: "", label: "Nobody yet" }, ...users.map((u) => ({ value: u.id, label: u.fullName }))],
    [users],
  );

  /* ---------- users */
  const usersWithoutPassword = scopedUsers.filter((u) => !u.hasPassword).length;

  /* ---------- monitoring settings */
  const settingGroups = useMemo(() => {
    const rows = settings.data ?? [];
    const known = SETTING_GROUPS.map((g) => ({ ...g, rows: rows.filter((r) => r.key.split(".")[0] === g.prefix) }));
    const prefixes = new Set(SETTING_GROUPS.map((g) => g.prefix));
    const other = rows.filter((r) => !prefixes.has(r.key.split(".")[0]));
    return [...known, ...(other.length ? [{ prefix: "other", label: "Other", rows: other }] : [])].filter((g) => g.rows.length > 0);
  }, [settings.data]);
  const [settingDraft, setSettingDraft] = useState<Record<string, string>>({});
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  // The outcome of the last save, shown on its own row (the page header may be scrolled away).
  const [settingNote, setSettingNote] = useState<{ key: string; tone: Tone; text: string } | null>(null);
  // A saved value stays in the field until the refreshed list carries it (no flash of the old value).
  useEffect(() => {
    const rows = settings.data;
    if (!rows) return;
    setSettingDraft((d) => {
      const next = { ...d };
      for (const r of rows) if (next[r.key] !== undefined && Number(next[r.key]) === r.value) delete next[r.key];
      return next;
    });
  }, [settings.data]);
  const saveSetting = useCallback(
    async (row: SettingRow) => {
      const raw = settingDraft[row.key];
      if (raw === undefined) return;
      const value = Number(raw);
      const clear = () =>
        setSettingDraft((d) => {
          const next = { ...d };
          delete next[row.key];
          return next;
        });
      if (raw.trim() === "" || !Number.isFinite(value) || value < 0) {
        setSettingNote({ key: row.key, tone: "bad", text: "Not saved: use 0 or more" });
        clear();
        return;
      }
      if (value === row.value) {
        clear();
        return;
      }
      setSavingSetting(row.key);
      try {
        const r = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: row.key, value }),
        });
        if (!r.ok) throw new Error(String(r.status));
        invalidateApi("/api/settings");
        setSettingNote({ key: row.key, tone: "good", text: `Saved · was ${row.value}${settingUnit(row.unit) ? ` ${settingUnit(row.unit)}` : ""}` });
      } catch {
        setSettingNote({ key: row.key, tone: "bad", text: "Not saved. Retry." });
        clear();
      } finally {
        setSavingSetting(null);
      }
    },
    [settingDraft],
  );


  /* ---------- step list: what each section holds, and what is not finished */
  const openOnboardings = (onboardings.data ?? []).filter((o) => o.status !== "committed").length;
  const doneOnboardings = (onboardings.data ?? []).length - openOnboardings;
  const waitingOnboardings = (onboardings.data ?? []).filter((o) => o.status === "waiting").length;
  const steps: Record<ConfigureSection, { detail: string; count?: string; badge?: { tone: Tone; text: string } }> = {
    plants: {
      count: hasLoaded ? String(plantRecords.length) : undefined,
      detail: !hasLoaded
        ? "Loading…"
        : `${plantRecords.length} plant${plantRecords.length === 1 ? "" : "s"} · ${machines.length} machine${machines.length === 1 ? "" : "s"}`,
      badge: plantsWithoutZone ? { tone: "warn", text: `${plantsWithoutZone} without time zone` } : undefined,
    },
    onboarding: {
      count: openOnboardings ? String(openOnboardings) : undefined,
      detail: !canAdminister
        ? "Plant managers only"
        : !onboardings.data
          ? "Loading…"
          : onboardings.data.length === 0
            ? "None started"
            : `${openOnboardings} in progress · ${doneOnboardings} done`,
      badge: waitingOnboardings ? { tone: "idle", text: `${waitingOnboardings} waiting to be read` } : undefined,
    },
    users: {
      count: hasLoaded ? String(scopedUsers.length) : undefined,
      detail: !hasLoaded ? "Loading…" : `${scopedUsers.length} user${scopedUsers.length === 1 ? "" : "s"} · ${assignableRoles.length} roles`,
      badge: usersWithoutPassword ? { tone: "warn", text: `${usersWithoutPassword} cannot sign in` } : undefined,
    },
    monitoring: {
      count: settings.data ? String(settings.data.length) : undefined,
      detail: !settings.data
        ? settings.error
          ? "Not available"
          : "Loading…"
        : `${settings.data.length} settings`,
    },
    support: {
      count: openTickets ? String(openTickets) : undefined,
      detail: tickets.data ? `${openTickets} open` : "Loading…",
      // The support team (super administrator) is the one who must act on an open ticket.
      badge: superAdmin && openTickets ? { tone: "warn", text: `${openTickets} waiting for an answer` } : undefined,
    },
  };

  /* ---------- columns */
  // Plants and machines are edited in their cells: a change saves when the field is left (Enter) or picked;
  // Escape puts the saved value back. "Details" opens the full form (description, capacity, photos, delete).
  const plantColumns: Column<PlantRecord>[] = [
    {
      key: "plant",
      header: "Plant",
      render: (p) => (
        <span className="pg-cfg-lead">
          <span className="ast-badge">
            <IconPlant />
          </span>
          <InlineText label={`Name of ${p.code}`} value={p.name} required disabled={!canEditPlant(p.id)} onSave={(v) => savePlant(p, { name: v }, "name")} strong />
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      width: "150px",
      render: (p) => (
        <InlineText label={`${p.name} code`} value={p.code} required upper disabled={!canEditPlant(p.id)} onSave={(v) => savePlant(p, { code: v }, "code")} />
      ),
    },
    {
      key: "location",
      header: "Location",
      width: "230px",
      render: (p) => (
        <InlineText
          label={`${p.name} location`}
          value={p.location ?? ""}
          placeholder="Town, site"
          disabled={!canEditPlant(p.id)}
          onSave={(v) => savePlant(p, { location: v }, "location")}
        />
      ),
    },
    {
      key: "manager",
      header: "Plant manager",
      width: "170px",
      render: (p) => (
        <InlineSelect
          label={`${p.name} manager`}
          value={p.managerUserId ?? ""}
          options={managerOptions}
          disabled={!canEditPlant(p.id)}
          onSave={(v) => savePlant(p, { managerUserId: v || null }, "manager")}
        />
      ),
    },
    {
      key: "tz",
      header: "Local time",
      width: "170px",
      render: (p) => {
        const zone = zoneById.get(p.id) ?? "";
        return (
          <InlineSelect
            label={`${p.name} time zone`}
            value={zone}
            options={[...(zone ? [] : [{ value: "", label: "Not set · choose" }]), ...zoneOptions]}
            disabled={!canEditPlant(p.id)}
            warn={!zone}
            onSave={(v) => (v ? savePlant(p, { timeZone: v }, "time zone") : Promise.resolve())}
          />
        );
      },
    },
    {
      key: "count",
      header: "Contains",
      width: "200px",
      render: (p) => (
        <span className="ast-cell-text">
          {plural(p.areaCount, "area")}, {plural(p.machineCount, "machine")}, {plural(p.userCount, "user")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "96px",
      render: (p) =>
        canEditPlant(p.id) ? (
          <span className="cfg-row-actions" onClick={(e) => e.stopPropagation()}>
            <PillButton
              variant="secondary"
              onClick={() => {
                setEditingPlant(p);
                setPlantDialogOpen(true);
              }}
            >
              Details
            </PillButton>
          </span>
        ) : null,
    },
  ];

  const machineColumns: Column<AssetMachine>[] = [
    {
      key: "machine",
      header: "Machine",
      render: (m) => (
        <span className="pg-cfg-lead">
          <span className="ast-badge">
            <IconMachine />
          </span>
          <span className="ast-cell-stack cfg-cell-grow">
            <InlineText
              label={`${m.id} name`}
              value={m.name}
              required
              strong
              disabled={!plantId || !canEditPlant(plantId)}
              onSave={(v) => saveMachine(m, { name: v }, "name")}
            />
            <span className="ast-cell-sub cfg-inline-sub">{m.id}</span>
          </span>
        </span>
      ),
    },
    {
      key: "area",
      header: "Area",
      width: "260px",
      render: (m) => {
        const area = areaOfMachine.get(m.id) ?? "";
        return (
          <InlineSelect
            label={`${m.name} area`}
            value={area}
            options={[...(area ? [] : [{ value: "", label: "No area · choose" }]), ...plantAreas.map((a) => ({ value: a.id, label: a.name }))]}
            disabled={!plantId || !canEditPlant(plantId) || plantAreas.length === 0}
            onSave={(v) => (v ? saveMachine(m, { areaId: v }, "area") : Promise.resolve())}
          />
        );
      },
    },
    {
      key: "criticality",
      header: "Importance",
      width: "170px",
      render: (m) => (
        <InlineSelect
          label={`${m.name} criticality`}
          value={m.criticality}
          options={CRITICALITY_OPTIONS}
          disabled={!plantId || !canEditPlant(plantId)}
          onSave={(v) => saveMachine(m, { criticality: v as AssetMachine["criticality"] }, "criticality")}
        />
      ),
    },
    { key: "sensors", header: "Sensors", width: "80px", render: (m) => <span className="ast-num">{m.signalsCount}</span> },
    {
      key: "go",
      header: "",
      width: "44px",
      render: (m) => (
        <button type="button" className="ast-icon-btn cfg-open" onClick={() => navigateToMachine(m.id)} title={`Open ${m.name}`} aria-label={`Open ${m.name}`}>
          <IconChevron />
        </button>
      ),
    },
  ];

  // Who may change what follows the server (assertCanChangeUser): anyone their own name, email and title;
  // user managers also role and status, never above their own reach. Plant access and passwords stay in Details.
  const canChangeAccessOf = (u: UserRecord) => canAddUsers && canEditUser(u);
  const roleOptionsFor = (u: UserRecord) =>
    assignableRoles.some((r) => r.id === u.roleId)
      ? assignableRoles.map((r) => ({ value: r.id, label: r.name }))
      : [{ value: u.roleId, label: u.role.name }, ...assignableRoles.map((r) => ({ value: r.id, label: r.name }))];
  const userColumns: Column<UserRecord>[] = [
    {
      key: "user",
      header: "Person",
      render: (u) => (
        <span className="pg-cfg-lead">
          <span
            className="ast-badge"
            data-tone={u.status === "Active" ? "good" : u.status === "On Call" ? "warn" : undefined}
            style={{ fontSize: 11, fontWeight: 600 }}
            title={u.id === currentUser?.id ? "You" : undefined}
          >
            {u.avatarInitials}
          </span>
          <span className="ast-cell-stack cfg-cell-grow">
            <InlineText label={`Name of ${u.email}`} value={u.fullName} required strong disabled={!canEditUser(u)} onSave={(v) => saveUser(u, { fullName: v }, "name")} />
            <InlineText label={`Email of ${u.fullName}`} value={u.email} required sub disabled={!canEditUser(u)} onSave={(v) => saveUser(u, { email: v.toLowerCase() }, "email")} />
          </span>
        </span>
      ),
    },
    {
      key: "title",
      header: "Job title",
      width: "220px",
      render: (u) => (
        <InlineText
          label={`Job title of ${u.fullName}`}
          value={u.title ?? ""}
          placeholder="Job title"
          disabled={!canEditUser(u)}
          onSave={(v) => saveUser(u, { title: v || null }, "job title")}
        />
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "230px",
      render: (u) => (
        <InlineSelect
          label={`Role of ${u.fullName}`}
          value={u.roleId}
          options={roleOptionsFor(u)}
          disabled={!canChangeAccessOf(u)}
          onSave={(v) => saveUser(u, { roleId: v }, "role")}
        />
      ),
    },
    {
      key: "plants",
      header: "Plants they can open",
      render: (u) => (
        <span className="ast-cell-text cfg-cell-clip" title={u.plantAccess.map((a) => `${a.plantCode} (${a.accessLevel})`).join(" · ")}>
          {u.role.allPlants
            ? "Every plant"
            : u.plantAccess.length > 0
              ? u.plantAccess.map((a) => `${a.plantCode} (${a.accessLevel})`).join(" · ")
              : "None yet"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (u) => (
        <InlineSelect
          label={`Status of ${u.fullName}`}
          value={u.status}
          options={USER_STATUS_OPTIONS}
          disabled={!canChangeAccessOf(u) || u.id === currentUser?.id}
          onSave={(v) => saveUser(u, { status: v as UserRecord["status"] }, "status")}
        />
      ),
    },
    {
      key: "signin",
      header: "Sign-in",
      width: "140px",
      render: (u) =>
        u.hasPassword ? <span className="ast-cell-text">Can sign in</span> : <StatusTag tone="warn" label="No password yet" />,
    },
    {
      key: "actions",
      header: "",
      width: "96px",
      render: (u) =>
        canEditUser(u) ? (
          <span className="cfg-row-actions">
            <PillButton
              variant="secondary"
              title="Plants they can open, password, department, shift, phone"
              onClick={() => {
                setEditingUser(u);
                setUserDialogOpen(true);
              }}
            >
              Details
            </PillButton>
          </span>
        ) : null,
    },
  ];

  const roleColumns: Column<RoleRecord>[] = [
    {
      key: "role",
      header: "Role",
      render: (r) => (
        <span className="pg-cfg-lead">
          <span className="ast-badge">
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
      header: "Can change",
      render: (r) => {
        const perms = [
          r.allPlants ? "Every plant" : null,
          r.canManageUsers ? "Users" : null,
          r.canManagePlants ? "Plants" : null,
          r.canManageMachines ? "Machines" : null,
          r.canManageEdge ? "Gateways" : null,
          r.canManageWorkOrders ? "Work orders" : null,
          r.canAckAlerts ? "Acknowledge alarms" : null,
        ].filter((p): p is string => Boolean(p));
        return <span className="ast-cell-text">{perms.length ? perms.join(", ") : "Can only look, not change anything"}</span>;
      },
    },
  ];

  /* ---------- header actions per section */
  const headerActions: React.ReactNode =
    section === "plants" ? (
      <>
        {selectedPlant && canEditPlant(selectedPlant.id) && (
          <PillButton variant="secondary" onClick={() => openAddMachine(selectedPlant)}>
            + Add machine
          </PillButton>
        )}
        {canAddPlants && (
          <PillButton
            variant="primary"
            onClick={() => {
              setEditingPlant(null);
              setPlantDialogOpen(true);
            }}
          >
            + Add plant
          </PillButton>
        )}
      </>
    ) : section === "support" ? (
      canRaiseTickets && (
        <PillButton variant="primary" onClick={() => setRaiseOpen(true)}>
          Raise a ticket
        </PillButton>
      )
    ) : section === "users" ? (
      canAddUsers && (
        <PillButton
          variant="primary"
          onClick={() => {
            setEditingUser(null);
            setUserDialogOpen(true);
          }}
        >
          + Add user
        </PillButton>
      )
    ) : null;

  /* ---------- second bar: what is inside the chosen section */
  const jumpTo = (elementId: string) => document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const subItems: Array<{ id: string; label: string; title?: string; count?: string; tone?: Tone; active?: boolean; run: () => void }> =
    section === "plants"
      ? plantRecords.map((p) => ({
          id: p.id,
          label: p.shortName || p.name,
          title: p.name,
          count: String(p.machineCount),
          tone: zoneById.get(p.id) ? undefined : "warn",
          active: p.id === plantId,
          run: () => setSelectedPlantId(p.id),
        }))
      : section === "users"
        ? [
            { id: "users", label: "Users", count: String(scopedUsers.length), tone: usersWithoutPassword ? "warn" : undefined, run: () => jumpTo("cfg-users") },
            { id: "roles", label: "Roles", count: String(assignableRoles.length), run: () => jumpTo("cfg-roles") },
          ]
        : section === "monitoring"
          ? settingGroups.map((g) => ({ id: g.prefix, label: g.label, count: String(g.rows.length), run: () => jumpTo(`cfg-set-${g.prefix}`) }))
          : [];

  const meta = SECTION_META[section];

  return (
    <div className="cfg-shell" aria-label="Configure">
      {/* Section bar (same bar as the Operator view): stays put on every section while the
          section below scrolls. A dot marks a section that needs attention; the count is
          what it holds. The chosen section's actions sit on the right. */}
      <header className="opc-topbar cfg-topbar" aria-label="Configure sections">
        <div className="opc-stage-tabs">
          <div className="opc-pill-group" role="tablist" aria-label="Configure sections">
            {visibleSections.map((id) => {
              const m = SECTION_META[id];
              const st = steps[id];
              const active = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className="opc-pill-btn"
                  data-active={active || undefined}
                  title={[m.label, st.detail, st.badge?.text].filter(Boolean).join(" · ")}
                  onClick={() => setSection(id)}
                >
                  {st.badge && st.badge.tone !== "idle" && <span className="ph-unit-dot" data-tone={st.badge.tone} aria-hidden="true" />}
                  <span>{m.label}</span>
                  {st.count && <span className="opc-app-count">{st.count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </header>
      <div className="opc-subbar cfg-subbar" role="region" aria-label={`${meta.label}: contents and actions`}>
        <div className="opc-stage-tabs">
          {subItems.length > 0 && (
            <div className="opc-pill-group opc-subassembly-pills" role={section === "plants" ? "tablist" : "group"} aria-label={`${meta.label} contents`}>
              {subItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="opc-pill-btn"
                  {...(section === "plants" ? { role: "tab", "aria-selected": Boolean(it.active) } : {})}
                  data-active={it.active || undefined}
                  title={it.title ?? it.label}
                  onClick={it.run}
                >
                  {it.tone && <span className="ph-unit-dot" data-tone={it.tone} aria-hidden="true" />}
                  <span>{it.label}</span>
                  {it.count && <span className="opc-app-count">{it.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="opc-stage-toggles">
          {result && (
            <span className="pg-note cfg-bar-note" data-tone={result.tone} role="status" title={result.text}>
              {result.text}
            </span>
          )}
          {headerActions}
        </div>
      </div>

      <div ref={bodyRef} className="pg-root ast-root cfg-root">
        <div className="cfg-main">
          <header className="ast-head pg-head">
            <div className="ast-head-main">
              <div className="ast-title-row">
                <h1 className="ast-title">{meta.label}</h1>
              </div>
              <p className="pg-cfg-context">
                {meta.blurb}
                {section === "monitoring" && !canAdminister ? " Only plant managers can change them." : ""}
                {steps[section].badge ? ` ${steps[section].badge!.text.replace(/^./, (c) => c.toUpperCase())}.` : ""}
              </p>
            </div>
          </header>

          {loadError && (
            <div className="ast-card pg-note" data-tone="bad" role="alert">
              The plant data could not be loaded. Try again.
            </div>
          )}

          {section === "plants" && (
            <>
              <section className="ast-card pg-table-card" aria-label="Plants">
                <div className="ast-card-head">
                  <h2 className="ast-card-title">
                    Plants
                    <span className="ast-caption">{plantRecords.length}</span>
                  </h2>
                </div>
                {plantRecords.length ? (
                  <Table
                    className="ast-table cfg-edit-table cfg-plants-table"
                    columns={plantColumns}
                    data={plantRecords}
                    keyExtractor={(p) => p.id}
                    selectedId={plantId ?? undefined}
                    onRowClick={(p) => setSelectedPlantId(p.id)}
                  />
                ) : (
                  <div className="ast-empty">
                    {hasLoaded ? "No plants yet. Add one, or bring one in from its documents." : "Loading plants…"}
                    {hasLoaded && (canAddPlants || canAdminister) && (
                      <div className="cfg-empty-actions">
                        {canAddPlants && (
                          <PillButton
                            variant="primary"
                            onClick={() => {
                              setEditingPlant(null);
                              setPlantDialogOpen(true);
                            }}
                          >
                            + Add plant
                          </PillButton>
                        )}
                        {canAdminister && (
                          <PillButton variant="secondary" onClick={() => setSection("onboarding")}>
                            Add from documents
                          </PillButton>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {selectedPlant && (
                <section className="ast-card pg-table-card" aria-label={`Machines in ${selectedPlant.name}`}>
                  <div className="ast-card-head">
                    <h2 className="ast-card-title">
                      Machines in {selectedPlant.name}
                      <span className="ast-caption">{plantMachines.length}</span>
                    </h2>
                  </div>
                  {plantMachines.length ? (
                    <Table className="ast-table cfg-edit-table cfg-machines-table" columns={machineColumns} data={plantMachines} keyExtractor={(m) => m.id} />
                  ) : (
                    <div className="ast-empty">No machines in this plant yet.</div>
                  )}
                </section>
              )}
            </>
          )}

          {section === "onboarding" &&
            (canAdminister ? (
              <OnboardingPanel
                onCommitted={() => {
                  void refreshData();
                  invalidateApi("/api/onboarding");
                }}
              />
            ) : (
              <div className="ast-card ast-empty">Only plant managers can bring in a new plant.</div>
            ))}

          {section === "users" && (
            <>
              <section id="cfg-users" className="ast-card pg-table-card" aria-label="Users">
                <div className="ast-card-head">
                  <h2 className="ast-card-title">
                    Users
                    <span className="ast-caption">{scopedUsers.length}</span>
                  </h2>
                </div>
                {scopedUsers.length ? (
                  <Table className="ast-table cfg-edit-table cfg-users-table" columns={userColumns} data={scopedUsers} keyExtractor={(u) => u.id} />
                ) : (
                  <div className="ast-empty">{hasLoaded ? "No users yet." : "Loading users…"}</div>
                )}
              </section>

              <section id="cfg-roles" className="ast-card pg-table-card" aria-label="Roles">
                <div className="ast-card-head">
                  <h2 className="ast-card-title">
                    Roles
                    <span className="ast-caption">What each kind of user may change</span>
                  </h2>
                </div>
                <Table className="ast-table" columns={roleColumns} data={assignableRoles} keyExtractor={(r) => r.id} />
              </section>
            </>
          )}

          {section === "support" && <SupportSection raiseOpen={raiseOpen} onRaiseClose={() => setRaiseOpen(false)} />}

          {section === "monitoring" && (
            <section className="ast-card pg-table-card" aria-label="Monitoring settings">
              {!settings.data ? (
                <div className="ast-empty">{settings.error ? "The settings could not be loaded. Try again." : "Loading settings…"}</div>
              ) : (
                <div className="cfg-settings">
                  {settingGroups.map((g) => (
                    <div key={g.prefix} id={`cfg-set-${g.prefix}`} className="cfg-set-group" role="group" aria-label={g.label}>
                      <h2 className="cfg-set-group-title">{g.label}</h2>
                      <ul className="cfg-set-list">
                        {g.rows.map((r) => {
                          const unit = settingUnit(r.unit);
                          const inputId = `set-${r.key}`;
                          return (
                            <li key={r.key} className="cfg-set-row">
                              <label className="cfg-set-label" htmlFor={inputId} title={r.key}>
                                {r.description}
                              </label>
                              <span className="cfg-set-value">
                                <input
                                  id={inputId}
                                  className="ui-input"
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step="any"
                                  value={settingDraft[r.key] ?? String(r.value)}
                                  disabled={!canAdminister || savingSetting === r.key}
                                  onChange={(e) => {
                                    setSettingNote((n) => (n?.key === r.key ? null : n));
                                    setSettingDraft((d) => ({ ...d, [r.key]: e.target.value }));
                                  }}
                                  onBlur={() => void saveSetting(r)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                    if (e.key === "Escape")
                                      setSettingDraft((d) => {
                                        const next = { ...d };
                                        delete next[r.key];
                                        return next;
                                      });
                                  }}
                                />
                                <span className="cfg-set-unit">{unit}</span>
                              </span>
                              <span className="cfg-set-when ast-caption" data-tone={settingNote?.key === r.key ? settingNote.tone : undefined} role="status">
                                {savingSetting === r.key
                                  ? "Saving…"
                                  : settingNote?.key === r.key
                                    ? settingNote.text
                                    : `Changed ${formatLocalTime(r.updatedAt, { date: true, seconds: false })}`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </div>

      {/* ---------- Dialog: Add / Edit Plant */}
      <PlantDialog
        open={plantDialogOpen}
        plant={editingPlant}
        users={users}
        zoneOptions={zoneOptions}
        onClose={() => setPlantDialogOpen(false)}
        onSave={async (input, existingId, draftKey) => {
          if (existingId) {
            await updatePlant(existingId, input);
            setResult({ tone: "good", text: `Updated plant ${input.name}` });
          } else {
            const created = await createPlant(input);
            // Photos drawn in the form (previewed there) now belong to the new plant.
            const attached = draftKey ? await attachDraftPhotos(draftKey, created.id, null).then((r) => (r as unknown[]).length, () => 0) : 0;
            setSelectedPlantId(created.id);
            setResult({ tone: "good", text: `Created plant ${created.code} · ${created.name}${attached ? ` with its drawing from ${attached} photo${attached === 1 ? "" : "s"}` : ""}` });
          }
          setPlantDialogOpen(false);
        }}
        onAddMachine={(p) => {
          setPlantDialogOpen(false);
          openAddMachine(p);
        }}
        onDelete={
          editingPlant && canDeletePlant(editingPlant.id)
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
        plant={machinePlant}
        areas={machinePlantAreas}
        onClose={() => setMachineDialogOpen(false)}
        onSave={async (input, draftKey) => {
          const created = await createMachine(input);
          const attached = draftKey ? await attachDraftPhotos(draftKey, input.plantId, created.id).then((r) => (r as unknown[]).length, () => 0) : 0;
          setResult({ tone: "good", text: `Added machine ${created.name} (${created.id})${attached ? ` with its drawing from ${attached} photo${attached === 1 ? "" : "s"}` : ""}` });
          setMachineDialogOpen(false);
        }}
      />

      {/* ---------- Dialog: Add / Edit User */}
      <UserDialog
        open={userDialogOpen}
        user={editingUser}
        roles={assignableRoles}
        plants={assignablePlants}
        canChangeAccess={canAddUsers}
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
          editingUser && canAddUsers && editingUser.id !== currentUser?.id && editingUser.id !== "usr-swastik"
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
   Inline cell editors (Plants & machines)
   ========================================================================== */

const USER_STATUS_OPTIONS: Array<{ value: UserRecord["status"]; label: string }> = [
  { value: "Active", label: "Active" },
  { value: "On Call", label: "On call" },
  { value: "Away", label: "Away" },
  { value: "Inactive", label: "Inactive" },
];

const CRITICALITY_OPTIONS: Array<{ value: AssetMachine["criticality"]; label: string }> = [
  { value: "A (Critical)", label: "A · Highest" },
  { value: "B (Essential)", label: "B · Medium" },
  { value: "C (General)", label: "C · Low" },
];

/** A "✓ Saved" mark on the edited cell for 2 s after its value is stored (the sub-bar names the change too). */
function useSavedMark(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(t);
  }, [saved]);
  const mark = useCallback(() => setSaved(true), []);
  return [saved, mark];
}

function SavedMark() {
  return (
    <span className="cfg-saved" aria-hidden="true">
      ✓ Saved
    </span>
  );
}

/**
 * A text cell that reads as plain text with a faint dotted rule (editable)
 * until hovered or focused. Saves on blur or Enter when changed; Escape
 * restores the saved value. A failed save keeps the typed text and marks the
 * cell; a stored one shows "✓ Saved" for 2 s.
 */
function InlineText({
  label,
  value,
  onSave,
  disabled,
  required,
  upper,
  strong,
  sub,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  disabled?: boolean;
  required?: boolean;
  upper?: boolean;
  strong?: boolean;
  /** The quieter second line of a cell (an email under a name). */
  sub?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [saved, markSaved] = useSavedMark();
  const commit = async () => {
    if (draft === null) return;
    const v = upper ? draft.trim().toUpperCase() : draft.trim();
    if (v === value.trim()) {
      setDraft(null);
      setState("idle");
      return;
    }
    if (required && !v) {
      setState("error");
      return;
    }
    setState("saving");
    try {
      await onSave(v);
      setDraft(null);
      setState("idle");
      markSaved();
    } catch {
      setState("error");
    }
  };
  return (
    <span className="cfg-inline-wrap">
      <input
        className="cfg-inline"
        data-strong={strong || undefined}
        data-sub={sub || undefined}
        data-state={state === "idle" ? undefined : state}
        aria-label={label}
        aria-invalid={state === "error" || undefined}
        title={draft ?? value}
        size={1}
        value={draft ?? value}
        placeholder={state === "error" && required && !(draft ?? "").trim() ? "Required" : disabled ? undefined : placeholder}
        disabled={disabled || state === "saving"}
        onChange={(e) => {
          setDraft(e.target.value);
          if (state === "error") setState("idle");
        }}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(null);
            setState("idle");
            e.currentTarget.blur();
          }
        }}
      />
      {saved && <SavedMark />}
    </span>
  );
}

/** A choice cell: plain text with a chevron on hover; saves as soon as a different option is picked. */
function InlineSelect({
  label,
  value,
  options,
  onSave,
  disabled,
  warn,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onSave: (v: string) => Promise<void>;
  disabled?: boolean;
  warn?: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [saved, markSaved] = useSavedMark();
  return (
    <span className="cfg-inline-select" data-state={state === "idle" ? undefined : state} data-warn={warn || undefined} data-saved={saved || undefined}>
      <select
        className="cfg-inline"
        aria-label={label}
        value={pending ?? value}
        disabled={disabled || state === "saving"}
        onChange={async (e) => {
          const v = e.target.value;
          if (v === value) return;
          setPending(v);
          setState("saving");
          try {
            await onSave(v);
            setState("idle");
            markSaved();
          } catch {
            setState("error");
          } finally {
            setPending(null);
          }
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
      {saved && <SavedMark />}
    </span>
  );
}

/* ==========================================================================
   Modal Dialogs for Plant, Machine, and User CRUD
   ========================================================================== */

/** After a refused save: put the cursor in the first field that needs fixing. */
function focusFirstInvalid() {
  requestAnimationFrame(() => document.querySelector<HTMLElement>('.ui-dialog [aria-invalid="true"]')?.focus());
}

function PlantDialog({
  open,
  plant,
  users,
  zoneOptions,
  onClose,
  onSave,
  onDelete,
  onAddMachine,
}: {
  open: boolean;
  plant: PlantRecord | null;
  users: UserRecord[];
  zoneOptions: { value: string; label: string }[];
  onClose: () => void;
  /** `draftKey`: a new plant's form, whose photos (drawn and previewed in it) are attached once the plant exists. */
  onSave: (input: CreatePlantInput, existingId: string | undefined, draftKey: string | null) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  /** Editing a plant: add a machine to it. */
  onAddMachine?: (plant: PlantRecord) => void;
}) {
  // A new plant's photos belong to this form until it is saved (or cancelled).
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<DrawingState>({ photos: 0, kind: null, drawing: false, ready: false });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [region, setRegion] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [timeZone, setTimeZone] = useState(browserTimeZone);
  const [serviceState, setServiceState] = useState<PlantRecord["serviceState"]>("Operational");
  const [managerUserId, setManagerUserId] = useState("");
  const [designCapacity, setDesignCapacity] = useState("");
  const [commissionedYear, setCommissionedYear] = useState("");
  const [description, setDescription] = useState("");
  const [initialAreas, setInitialAreas] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Field errors show once Save was pressed, and clear as the field is filled.
  const [tried, setTried] = useState(false);
  const [touched, setTouched] = useState(false);
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      setTouched(true);
      set(v);
    };
  const missing = {
    code: code.trim() ? null : "Enter the plant code",
    shortName: shortName.trim() ? null : "Enter a short name",
    name: name.trim() ? null : "Enter the full plant name",
    commissionedYear: !commissionedYear.trim() || Number.isInteger(Number(commissionedYear)) ? null : "Enter a year, like 2019",
  };

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTried(false);
    setTouched(false);
    if (plant) {
      setCode(plant.code);
      setName(plant.name);
      setShortName(plant.shortName);
      setRegion(plant.region ?? "");
      setLocation(plant.location ?? "");
      setCoordinates(plant.coordinates ?? "");
      setTimeZone(plant.timeZone);
      setServiceState(plant.serviceState);
      setManagerUserId(plant.managerUserId ?? "");
      setDesignCapacity(plant.designCapacity ?? "");
      setCommissionedYear(plant.commissionedYear ? String(plant.commissionedYear) : "");
      setDescription(plant.description ?? "");
    } else {
      setCode("");
      setName("");
      setShortName("");
      setRegion("");
      setLocation("");
      setCoordinates("");
      setTimeZone(browserTimeZone());
      setServiceState("Operational");
      setManagerUserId("");
      setDesignCapacity("");
      setCommissionedYear("");
      setDescription("");
      setInitialAreas("");
    }
  }, [open, plant, users]);

  // A new form per opening (not when the user list refreshes): its own photos.
  useEffect(() => {
    if (!open) return;
    setDraftKey(plant ? null : crypto.randomUUID());
    setDrawing({ photos: 0, kind: null, drawing: false, ready: false });
  }, [open, plant]);

  /** Closing without saving: the new plant's photos go. */
  const close = () => {
    if (draftKey && drawing.photos) void discardDraftPhotos(draftKey);
    onClose();
  };

  const submit = async () => {
    setTried(true);
    if (Object.values(missing).some(Boolean)) {
      focusFirstInvalid();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSave(
        {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          shortName: shortName.trim(),
          region,
          location,
          coordinates,
          timeZone,
          serviceState,
          managerUserId: managerUserId || null,
          designCapacity,
          commissionedYear: commissionedYear.trim() ? Number(commissionedYear) : null,
          description,
          initialAreas: initialAreas
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
        plant?.id,
        draftKey,
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
      onClose={close}
      title={plant ? `Edit plant · ${plant.name}` : "Add a plant"}
      subtitle="The plant's place in the plant list and its user access are set up for you"
      busy={busy}
      dirty={touched || drawing.photos > 0}
      onSubmit={submit}
      width={drawing.photos ? 880 : 620}
      footerStart={
        onDelete && plant ? (
          <ConfirmAction
            label="Delete plant"
            question={plant.machineCount ? `Delete this plant and its ${plant.machineCount} machine${plant.machineCount === 1 ? "" : "s"}?` : "Delete this plant?"}
            disabled={busy}
            onConfirm={async () => {
              setBusy(true);
              try {
                await onDelete(plant.id);
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Delete failed");
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : undefined
      }
      footer={
        <>
          {plant && onAddMachine && (
            <PillButton variant="secondary" onClick={() => onAddMachine(plant)} disabled={busy}>
              + Add machine
            </PillButton>
          )}
          <PillButton variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton variant="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : plant ? "Save changes" : "Create plant"}
          </PillButton>
        </>
      }
    >
      {err && <FormNote tone="bad">{err}</FormNote>}
      <FieldGrid>
        <Field label="Plant code" hint="Short unique code, for example MIN-LUM-04" required error={tried ? missing.code : null}>
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={code} onChange={edit(setCode)} autoCapitalize="characters" mono placeholder="MIN-LUM-04" />}
        </Field>
        <Field label="Short name" required error={tried ? missing.shortName : null}>
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={shortName} onChange={edit(setShortName)} placeholder="Lumwana Concentrator" />}
        </Field>
        <Field label="Full plant name" wide required error={tried ? missing.name : null}>
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={name} onChange={edit(setName)} placeholder="Lumwana Super-Pit Comminution Plant" />}
        </Field>
        <Field label="Region">
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={region} onChange={edit(setRegion)} />}
        </Field>
        <Field label="Location">
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={location} onChange={edit(setLocation)} />}
        </Field>
        <Field label="Coordinates">
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={coordinates} onChange={edit(setCoordinates)} mono />}
        </Field>
        <Field label="Time zone">
          {(id, describedBy) => <Select id={id} describedBy={describedBy} value={timeZone} onChange={edit(setTimeZone)} options={zoneOptions} />}
        </Field>
        <Field label="Plant manager">
          {(id, describedBy) => (
            <Select
              id={id}
              describedBy={describedBy}
              value={managerUserId}
              onChange={edit(setManagerUserId)}
              options={[
                { value: "", label: "Unassigned" },
                ...users.map((u) => ({ value: u.id, label: `${u.fullName} (${u.role.name})` })),
              ]}
            />
          )}
        </Field>
        <Field label="Plant status">
          {(id, describedBy) => (
            <Select
              id={id}
              describedBy={describedBy}
              value={serviceState}
              onChange={edit((v: string) => setServiceState(v as typeof serviceState))}
              options={[
                { value: "Operational", label: "Operational" },
                { value: "Standby", label: "Standby" },
                { value: "Maintenance", label: "Maintenance" },
              ]}
            />
          )}
        </Field>
        <Field label="Design capacity">
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={designCapacity} onChange={edit(setDesignCapacity)} />}
        </Field>
        <Field label="Year it started running" error={tried ? missing.commissionedYear : null}>
          {(id, describedBy) => <NumberInput id={id} describedBy={describedBy} value={commissionedYear} onChange={edit(setCommissionedYear)} min={1950} max={2050} />}
        </Field>
        {!plant && (
          <Field label="Plant areas (separate with commas)" wide>
            {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={initialAreas} onChange={edit(setInitialAreas)} />}
          </Field>
        )}
        <Field label="Description" wide>
          {(id, describedBy) => <TextArea id={id} describedBy={describedBy} value={description} onChange={edit(setDescription)} rows={2} />}
        </Field>
        <Field label="Photos or site layout" wide>
          {(id, describedBy) => (
            <PhotoPicker
              id={id}
              describedBy={describedBy}
              label="Photos or drawings"
              hint="A photo, aerial view or layout of the plant or a line is drawn as its line drawing and shown here before you add the plant."
              draft={draftKey ? { draftKey, subject: "plant", name, code } : null}
              plantId={plant?.id ?? null}
              previewLabel={name || "Plant"}
              onState={setDrawing}
            />
          )}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

function MachineDialog({
  open,
  plant,
  areas,
  onClose,
  onSave,
}: {
  open: boolean;
  /** The plant the machine is added to (machines are added inside their plant). */
  plant: PlantRecord | null;
  /** The plant's areas (factories, sections, lines). */
  areas: Array<{ id: string; name: string }>;
  onClose: () => void;
  /** `draftKey`: the form whose photos (drawn and previewed in it) are attached once the machine exists. */
  onSave: (input: CreateMachineInput, draftKey: string | null) => Promise<void>;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const plantId = plant?.id ?? "";
  const [areaId, setAreaId] = useState("");
  const [areaName, setAreaName] = useState("");
  // The machine's photos belong to this form until it is saved (or cancelled).
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<DrawingState>({ photos: 0, kind: null, drawing: false, ready: false });
  const [type, setType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [powerRating, setPowerRating] = useState("");
  const [operatingSpeed, setOperatingSpeed] = useState("");
  // The six optional details fold away; they open by themselves when one has a value.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasDetails = [type, manufacturer, model, serialNumber, powerRating, operatingSpeed].some((v) => v.trim() !== "");
  const [diagramType, setDiagramType] = useState<string>("pump");
  const [criticality, setCriticality] = useState<"A (Critical)" | "B (Essential)" | "C (General)">("A (Critical)");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Field errors show once Add was pressed, and clear as the field is filled.
  const [tried, setTried] = useState(false);
  const [touched, setTouched] = useState(false);
  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      setTouched(true);
      set(v);
    };
  const missing = {
    id: id.trim() ? null : "Enter the machine code",
    name: name.trim() ? null : "Enter the machine name",
    areaName: areaId || areaName.trim() ? null : "Enter a name for the new area",
  };

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTried(false);
    setTouched(false);
    setDraftKey(crypto.randomUUID());
    setDrawing({ photos: 0, kind: null, drawing: false, ready: false });
    setDiagramType("pump");
    setAreaId(areas[0]?.id ?? "");
    setAreaName("");
    setDetailsOpen(hasDetails);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset per opening, not when the area list refreshes
  }, [open, plant?.id]);
  // The photo's drawing becomes the machine's drawing unless another style was chosen on purpose.
  const lastKind = React.useRef<string | null>(null);
  useEffect(() => {
    if (drawing.kind && (diagramType === "pump" || diagramType === lastKind.current)) setDiagramType(drawing.kind);
    lastKind.current = drawing.kind;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the photo's drawing kind changes
  }, [drawing.kind]);
  /** Closing without saving: the photos go. */
  const close = () => {
    if (draftKey && drawing.photos) void discardDraftPhotos(draftKey);
    onClose();
  };

  const submit = async () => {
    setTried(true);
    if (Object.values(missing).some(Boolean)) {
      focusFirstInvalid();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSave(
        {
        id: id.trim().toUpperCase(),
        name: name.trim(),
        plantId,
        areaId: areaId || undefined,
        areaName: areaId ? undefined : areaName.trim(),
        type,
        manufacturer,
        model,
        serialNumber,
        powerRating,
        operatingSpeed,
        diagramType,
        criticality,
        },
        draftKey,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add the machine");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={plant ? `Add a machine to ${plant.shortName || plant.name}` : "Add a machine"}
      subtitle="Creates the machine and its model record in this plant; a photo of it becomes its 2D drawing and 3D model"
      busy={busy}
      dirty={touched || drawing.photos > 0}
      onSubmit={submit}
      width={drawing.photos ? 880 : 620}
      footer={
        <>
          <PillButton variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton variant="primary" type="submit" disabled={busy}>
            {busy ? "Adding…" : drawing.drawing ? "Add without waiting for the drawing" : "Add machine"}
          </PillButton>
        </>
      }
    >
      {err && <FormNote tone="bad">{err}</FormNote>}
      <FieldGrid>
        <Field label="Machine code" hint="Short unique code, for example PUMP-205" required error={tried ? missing.id : null}>
          {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={id} onChange={edit(setId)} autoCapitalize="characters" mono placeholder="PUMP-205" />}
        </Field>
        <Field label="Plant">
          {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={plant ? `${plant.code} · ${plant.shortName || plant.name}` : ""} onChange={() => undefined} disabled />}
        </Field>
        <Field label="Machine name" wide required error={tried ? missing.name : null}>
          {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={name} onChange={edit(setName)} />}
        </Field>
        <Field label="Area (factory, section, line)">
          {(fid, describedBy) => (
            <Select
              id={fid}
              describedBy={describedBy}
              value={areaId}
              onChange={edit(setAreaId)}
              options={[...areas.map((a) => ({ value: a.id, label: a.name })), { value: "", label: "A new area…" }]}
            />
          )}
        </Field>
        {!areaId && (
          <Field label="New area name" required error={tried ? missing.areaName : null}>
            {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={areaName} onChange={edit(setAreaName)} placeholder="Kiln line" />}
          </Field>
        )}
        <Field label="Photo, drawing or P&ID" wide>
          {(fid, describedBy) => (
            <PhotoPicker
              id={fid}
              describedBy={describedBy}
              label="Photos or drawings"
              hint="Claude Code draws the machine's 2D drawing and 3D model from it and shows them here before you add the machine."
              draft={draftKey ? { draftKey, subject: "machine", name, type, code: id, plantId } : null}
              previewLabel={name || "Machine"}
              onState={setDrawing}
            />
          )}
        </Field>
        <Field label="Drawing style">
          {(fid, describedBy) => (
            <Select
              id={fid}
              describedBy={describedBy}
              value={diagramType}
              onChange={edit(setDiagramType)}
              options={[
                ...(drawing.kind ? [{ value: drawing.kind, label: drawing.ready ? "Drawn from the photo" : "Drawn from the photo (being drawn)" }] : []),
                { value: "pump", label: "Centrifugal / Slurry Pump" },
                { value: "mill", label: "SAG / Ball Grinding Mill" },
                { value: "crusher", label: "Gyratory Crusher / Conveyor" },
                { value: "blower", label: "Centrifugal Blower / Agitator" },
                { value: "kiln", label: "Rotary Kiln Pyro Line" },
                // Drawings made with the machine-diagram-2d skill (src/components/assets/diagrams).
                ...DIAGRAM_SHEETS.map((d) => ({ value: d.diagramType, label: d.label })),
              ]}
            />
          )}
        </Field>
        <Field label="Importance" hint="A = the plant stops without it, C = little effect if it stops">
          {(fid, describedBy) => (
            <Select
              id={fid}
              describedBy={describedBy}
              value={criticality}
              onChange={edit((v: string) => setCriticality(v as typeof criticality))}
              options={CRITICALITY_OPTIONS}
            />
          )}
        </Field>
      </FieldGrid>
      <MoreFields label="More details" open={detailsOpen} onToggle={setDetailsOpen}>
        <FieldGrid>
          <Field label="Machine type">
            {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={type} onChange={edit(setType)} />}
          </Field>
          <Field label="Manufacturer">
            {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={manufacturer} onChange={edit(setManufacturer)} />}
          </Field>
          <Field label="Model number">
            {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={model} onChange={edit(setModel)} />}
          </Field>
          <Field label="Serial number">
            {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={serialNumber} onChange={edit(setSerialNumber)} mono />}
          </Field>
          <Field label="Power rating">
            {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={powerRating} onChange={edit(setPowerRating)} />}
          </Field>
          <Field label="Operating speed">
            {(fid, describedBy) => <TextInput id={fid} describedBy={describedBy} value={operatingSpeed} onChange={edit(setOperatingSpeed)} />}
          </Field>
        </FieldGrid>
      </MoreFields>
    </Dialog>
  );
}

function UserDialog({
  open,
  user,
  roles,
  plants,
  canChangeAccess,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  user: UserRecord | null;
  roles: RoleRecord[];
  plants: PlantRecord[];
  /** False when someone without user management edits their own profile. */
  canChangeAccess: boolean;
  onClose: () => void;
  onSave: (input: CreateUserInput, existingId?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [shift, setShift] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [status, setStatus] = useState<"Active" | "On Call" | "Away" | "Inactive">("Active");
  const [selectedPlants, setSelectedPlants] = useState<Record<string, "admin" | "write" | "read" | "none">>({});
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Field errors show once Save was pressed, and clear as the field is filled.
  const [tried, setTried] = useState(false);
  const missing = {
    fullName: fullName.trim() ? null : "Enter the person's name",
    email: !email.trim() ? "Enter an email address" : /^[^\s@]+@[^\s@]+$/.test(email.trim()) ? null : "Enter a full email address, like name@company.com",
    password: password && password.length < 8 ? "Use at least 8 characters" : null,
  };

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setTried(false);
    setPassword("");
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      setTitle(user.title ?? "");
      setDepartment(user.department ?? "");
      setPhone(user.phone ?? "");
      setShift(user.shift ?? "");
      setRoleId(user.roleId);
      setStatus(user.status);
      const map: Record<string, "admin" | "write" | "read" | "none"> = {};
      for (const p of plants) map[p.id] = "none";
      for (const a of user.plantAccess) map[a.plantId] = a.accessLevel;
      setSelectedPlants(map);
    } else {
      setFullName("");
      setEmail("");
      setTitle("");
      setDepartment("");
      setPhone("");
      setShift("");
      setRoleId(roles[0]?.id ?? "");
      setStatus("Active");
      const map: Record<string, "admin" | "write" | "read" | "none"> = {};
      for (const [idx, p] of plants.entries()) map[p.id] = idx === 0 ? "write" : "none";
      setSelectedPlants(map);
    }
  }, [open, user, plants, roles]);

  // The role list may hide the edited person's own role (a super administrator role
  // for a plant manager): keep it selectable so the form shows the truth.
  const roleOptions = useMemo(() => {
    const list = roles.map((r) => ({ value: r.id, label: r.name }));
    if (user && !roles.some((r) => r.id === user.roleId)) list.unshift({ value: user.roleId, label: user.role.name });
    return list;
  }, [roles, user]);
  const allPlants = roles.find((r) => r.id === roleId)?.allPlants ?? (user?.roleId === roleId && user.role.allPlants);

  const submit = async () => {
    setTried(true);
    if (Object.values(missing).some(Boolean)) {
      focusFirstInvalid();
      return;
    }
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
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          title,
          department,
          phone,
          shift,
          ...(password ? { password } : {}),
          ...(canChangeAccess
            ? {
                roleId,
                status,
                defaultPlantId: allPlants ? null : (plantAssignments[0]?.plantId ?? null),
                plantAssignments: allPlants ? [] : plantAssignments,
              }
            : { roleId: user?.roleId ?? roleId }),
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
      title={user ? `Edit user · ${user.fullName}` : "Add a user"}
      subtitle="Choose what this person may change and which plants they can open"
      busy={busy}
      onSubmit={submit}
      width={620}
      footerStart={
        onDelete && user ? (
          <ConfirmAction
            label="Delete user"
            question="Delete this user?"
            disabled={busy}
            onConfirm={async () => {
              setBusy(true);
              try {
                await onDelete(user.id);
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Delete failed");
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : undefined
      }
      footer={
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton variant="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : user ? "Save changes" : "Create user"}
          </PillButton>
        </>
      }
    >
      {err && <FormNote tone="bad">{err}</FormNote>}
      <FieldGrid>
        <Field label="Full name" required error={tried ? missing.fullName : null}>
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={fullName} onChange={setFullName} placeholder="Mulenga Phiri" />}
        </Field>
        <Field label="Email address" required error={tried ? missing.email : null}>
          {(id, describedBy) => (
            <TextInput
              id={id}
              describedBy={describedBy}
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="off"
              value={email}
              onChange={setEmail}
              placeholder="mulenga.phiri@ultron.industrial"
            />
          )}
        </Field>
        <Field label="Role" hint="Decides what this person may change" required>
          {(id, describedBy) => (
            <Select
              id={id}
              describedBy={describedBy}
              value={roleId}
              onChange={setRoleId}
              options={roleOptions}
              disabled={!canChangeAccess}
            />
          )}
        </Field>
        <Field label="Status">
          {(id, describedBy) => (
            <Select
              id={id}
              describedBy={describedBy}
              value={status}
              disabled={!canChangeAccess}
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
        <Field label="Job title">
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={title} onChange={setTitle} />}
        </Field>
        <Field label="Department">
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={department} onChange={setDepartment} />}
        </Field>
        <Field label="Phone">
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={phone} onChange={setPhone} />}
        </Field>
        <Field label="Shift">
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} value={shift} onChange={setShift} />}
        </Field>
        <Field
          label={user ? "New password" : "Password"}
          hint={
            user
              ? user.hasPassword
                ? "Leave empty to keep the current password"
                : "No password yet: set one so this person can sign in"
              : "At least 8 characters. Without one this person cannot sign in"
          }
          error={tried ? missing.password : null}
        >
          {(id, describedBy) => <TextInput id={id} describedBy={describedBy} type="password" value={password} onChange={setPassword} autoComplete="new-password" />}
        </Field>
      </FieldGrid>

      {allPlants ? (
        <FieldSection title="Which plants this person can open">
          <FormNote tone="info">This role opens every plant, including plants added later.</FormNote>
        </FieldSection>
      ) : (
        canChangeAccess && (
          <FieldSection title="Which plants this person can open">
            <FieldGrid>
              {plants.map((p) => (
                <Field key={p.id} label={`${p.code} · ${p.shortName}`}>
                  {(id, describedBy) => (
                    <Select
                      id={id}
                      describedBy={describedBy}
                      value={selectedPlants[p.id] ?? "none"}
                      onChange={(v) =>
                        setSelectedPlants((prev) => ({
                          ...prev,
                          [p.id]: v as "admin" | "write" | "read" | "none",
                        }))
                      }
                      options={[
                        { value: "none", label: "No access" },
                        { value: "read", label: "Can view only" },
                        { value: "write", label: "Can view and change" },
                        { value: "admin", label: "Plant administrator" },
                      ]}
                    />
                  )}
                </Field>
              ))}
            </FieldGrid>
          </FieldSection>
        )
      )}
    </Dialog>
  );
}
