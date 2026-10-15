"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  HierarchyNode,
  AssetMachine,
  MappedSignal,
  DiagnosisRecord,
  MachineTrendRecord,
  RackChassisRecord,
} from "@/components/assets/assets-data";
import { WorkspaceTab } from "@/components/liquid-glass-shell";
import { AssetsSubPage } from "@/components/assets/assets-view";
import type { RoleRecord, UserRecord, CreateUserInput, UpdateUserInput } from "@/server/services/user-service";
import type { PlantRecord, CreatePlantInput, UpdatePlantInput } from "@/server/services/plant-service";
import type { CreateMachineInput } from "@/server/services/industrial-service";

export type { RoleRecord, UserRecord, CreateUserInput, UpdateUserInput, PlantRecord, CreatePlantInput, UpdatePlantInput, CreateMachineInput };

export interface DatabaseStatus {
  connected: boolean;
  version?: string;
  database?: string;
  counts?: Record<string, number>;
  error?: string;
}

export interface FleetStats {
  totalMachines: number;
  operationalCount: number;
  advisoryCount: number;
  standbyCount: number;
  avgHealth: number;
  totalSignals: number;
  racksCount: number;
  machines: Array<{
    id: string;
    name: string;
    plantId?: string;
    plant: string;
    area: string;
    status: string;
    health: number;
    criticality: string;
    signalsCount: number;
  }>;
}

interface IndustrialDataContextType {
  // Navigation State
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  activeSubPage: AssetsSubPage;
  setActiveSubPage: (sub: AssetsSubPage) => void;
  selectedMachineId: string | null;
  setSelectedMachineId: (id: string | null) => void;
  navigateToMachine: (machineId: string, subPage?: AssetsSubPage) => void;
  navigateToAssetsHome: () => void;
  /** Plant chosen in the top bar's plant switcher (persisted). Null until hierarchy loads. */
  selectedPlantId: string | null;
  setSelectedPlantId: (id: string) => void;

  // Multi-User & Multi-Plant RBAC Context
  users: UserRecord[];
  roles: RoleRecord[];
  plants: PlantRecord[];
  currentUserId: string | null;
  currentUser: UserRecord | null;
  /** Sign-in state: each account signs in separately and sees only its own plants. */
  authStatus: "checking" | "signedIn" | "signedOut";
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => Promise<void>;

  // Data from PostgreSQL (filtered by active user's accessible plants)
  hierarchy: HierarchyNode[];
  allHierarchy: HierarchyNode[];
  machines: AssetMachine[];
  allMachines: AssetMachine[];
  selectedMachine: AssetMachine | null;
  signals: MappedSignal[];
  diagnosisRecords: DiagnosisRecord[];
  trendRecords: MachineTrendRecord[];
  racks: RackChassisRecord[];
  fleetStats: FleetStats | null;
  databaseStatus: DatabaseStatus | null;

  // State flags & mutations
  isLoading: boolean;
  /** True once the first load attempt has finished (success or failure). */
  hasLoaded: boolean;
  /** Endpoints that failed on the last load, or null when every request succeeded. */
  loadError: string | null;
  isDbLive: boolean;
  refreshData: () => Promise<void>;
  reseedDatabase: () => Promise<boolean>;

  // Multi-User, Multi-Plant & Machine CRUD helpers
  createPlant: (input: CreatePlantInput) => Promise<PlantRecord>;
  updatePlant: (id: string, patch: UpdatePlantInput) => Promise<PlantRecord>;
  deletePlant: (id: string) => Promise<void>;
  createUser: (input: CreateUserInput) => Promise<UserRecord>;
  updateUser: (id: string, patch: UpdateUserInput) => Promise<UserRecord>;
  deleteUser: (id: string) => Promise<void>;
  createMachine: (input: CreateMachineInput) => Promise<AssetMachine>;
  deleteMachine: (id: string) => Promise<void>;
}

const WORKSPACE_TABS: readonly WorkspaceTab[] = ["home", "assets", "devices", "assetiq", "configure"];
const SUB_PAGES: readonly AssetsSubPage[] = [
  "overview", "sensors", "diagnosis", "thermal", "prognosis",
  "analysis", "health", "trends", "rack", "simulation",
];
const isWorkspaceTab = (v: string | null): v is WorkspaceTab => WORKSPACE_TABS.includes(v as WorkspaceTab);
const isSubPage = (v: string | null): v is AssetsSubPage => SUB_PAGES.includes(v as AssetsSubPage);

const PLANT_KEY = "ultron.home.plant";
const USER_KEY = "ultron.auth.user";
const DEFAULT_PLANT = "plant-kln";

const SNAPSHOT_KEY = "ultron.data.snapshot.v2";

type DataSnapshot = { hierarchy: HierarchyNode[]; machines: AssetMachine[]; plants?: PlantRecord[]; users?: UserRecord[] };

function readSnapshot(): DataSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as Partial<DataSnapshot>;
    return Array.isArray(snap.hierarchy) && Array.isArray(snap.machines) && snap.hierarchy.length > 0
      ? { hierarchy: snap.hierarchy, machines: snap.machines, plants: snap.plants, users: snap.users }
      : null;
  } catch {
    return null;
  }
}

function writeSnapshot(snap: { hierarchy: unknown[]; machines: unknown[]; plants?: unknown[]; users?: unknown[] }) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    /* storage unavailable or full */
  }
}

/** One API read: its `data`, or null with the failure appended to `failed`. Never papered over. */
async function loadData(name: string, url: string, failed: string[]): Promise<unknown> {
  try {
    const r = await fetch(url);
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !("data" in j)) {
      failed.push(`${name} (${j?.error?.message ?? `HTTP ${r.status}`})`);
      return null;
    }
    return j.data;
  } catch (e) {
    failed.push(`${name} (${e instanceof Error ? e.message : "network error"})`);
    return null;
  }
}

async function mutateApi<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !("data" in json)) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

const IndustrialDataContext = createContext<IndustrialDataContextType | undefined>(undefined);

export function IndustrialDataProvider({ children }: { children: React.ReactNode }) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("home");
  const [activeSubPage, setActiveSubPage] = useState<AssetsSubPage>("overview");
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [storedPlantId, setStoredPlantId] = useState<string | null>(null);
  // Signed-in account (server session cookie); replaces the old free user switch.
  const [auth, setAuth] = useState<{ status: "checking" | "signedIn" | "signedOut"; userId: string | null }>({ status: "checking", userId: null });
  useEffect(() => {
    try {
      setStoredPlantId(localStorage.getItem(PLANT_KEY));
      localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (r) => {
        const body = (await r.json().catch(() => null)) as { data?: { userId?: string } } | null;
        if (!cancelled) setAuth(r.ok && body?.data?.userId ? { status: "signedIn", userId: body.data.userId } : { status: "signedOut", userId: null });
      })
      .catch(() => {
        if (!cancelled) setAuth({ status: "signedOut", userId: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep links: every page is addressable as ?tab=…&machine=…&page=…, so any page
  // can be opened on its own, shared, and reached with browser back/forward.
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    const apply = () => {
      const p = new URLSearchParams(window.location.search);
      const tab = p.get("tab");
      const machine = p.get("machine");
      const page = p.get("page");
      setActiveTab(isWorkspaceTab(tab) ? tab : machine ? "assets" : "home");
      setSelectedMachineId(machine || null);
      setActiveSubPage(isSubPage(page) ? page : "overview");
    };
    apply();
    setUrlReady(true);
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);
  useEffect(() => {
    if (!urlReady) return;
    const p = new URLSearchParams();
    if (activeTab !== "home") p.set("tab", activeTab);
    if (activeTab === "assets" && selectedMachineId) {
      p.set("machine", selectedMachineId);
      if (activeSubPage !== "overview") p.set("page", activeSubPage);
    }
    const next = p.toString() ? `?${p}` : window.location.pathname;
    const current = window.location.search || window.location.pathname;
    if (next !== current) window.history.pushState(null, "", next);
  }, [urlReady, activeTab, selectedMachineId, activeSubPage]);

  // Industrial data from PostgreSQL only. Everything starts empty; if a request
  // fails, the matching collection stays empty and `loadError` names it.
  const [allHierarchy, setAllHierarchy] = useState<HierarchyNode[]>([]);
  const [allMachines, setAllMachines] = useState<AssetMachine[]>([]);
  const [plants, setPlants] = useState<PlantRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [signals, setSignals] = useState<MappedSignal[]>([]);
  const [diagnosisRecords, setDiagnosisRecords] = useState<DiagnosisRecord[]>([]);
  const [trendRecords, setTrendRecords] = useState<MachineTrendRecord[]>([]);
  const [racks, setRacks] = useState<RackChassisRecord[]>([]);
  const [fleetStats, setFleetStats] = useState<FleetStats | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDbLive, setIsDbLive] = useState<boolean>(false);

  // Last good hierarchy + machines from this browser paint the shell instantly on
  // reload; the PostgreSQL reads below replace them as soon as they land.
  useEffect(() => {
    const snap = readSnapshot();
    if (!snap) return;
    setAllHierarchy((cur) => (cur.length === 0 ? snap.hierarchy : cur));
    setAllMachines((cur) => (cur.length === 0 ? snap.machines : cur));
    if (Array.isArray(snap.plants)) setPlants((cur) => (cur.length === 0 ? snap.plants! : cur));
    if (Array.isArray(snap.users)) setUsers((cur) => (cur.length === 0 ? snap.users! : cur));
  }, []);

  // Fleet-wide reads load once; the selected machine's own reads load on their
  // own when the selection changes, so switching machines never refetches the fleet.
  const [machineLoadError, setMachineLoadError] = useState<string | null>(null);
  const machineSeq = useRef(0);
  const loadMachineData = useCallback(async (machineId: string | null) => {
    const seq = ++machineSeq.current;
    if (!machineId) {
      setSignals([]);
      setDiagnosisRecords([]);
      setTrendRecords([]);
      setMachineLoadError(null);
      return;
    }
    const failed: string[] = [];
    const q = `?machineId=${encodeURIComponent(machineId)}`;
    const [sig, diag, tr] = await Promise.all([
      loadData("signals", `/api/signals${q}`, failed),
      loadData("diagnosis", `/api/diagnosis${q}`, failed),
      loadData("trends", `/api/trends${q}`, failed),
    ]);
    if (seq !== machineSeq.current) return; // a newer selection won
    setSignals(Array.isArray(sig) ? (sig as MappedSignal[]) : []);
    setDiagnosisRecords(Array.isArray(diag) ? (diag as DiagnosisRecord[]) : []);
    setTrendRecords(Array.isArray(tr) ? (tr as MachineTrendRecord[]) : []);
    setMachineLoadError(failed.length > 0 ? failed.join(" · ") : null);
  }, []);

  useEffect(() => {
    void loadMachineData(selectedMachineId);
  }, [loadMachineData, selectedMachineId]);

  const selectedRef = useRef(selectedMachineId);
  selectedRef.current = selectedMachineId;

  // Fetch all live data from PostgreSQL API routes
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const failed: string[] = [];
    try {
      // Hierarchy and machines gate every page, so they land (and end the first
      // load) on their own; the slower fleet/health/rack reads fill in after.
      const core = Promise.all([
        loadData("hierarchy", "/api/hierarchy", failed),
        loadData("machines", "/api/machines", failed),
        loadData("plants", "/api/plants", failed),
        loadData("users", "/api/users", failed),
        loadData("roles", "/api/roles", failed),
      ]).then(([h, m, pl, us, rl]) => {
        if (Array.isArray(h)) setAllHierarchy(h as HierarchyNode[]);
        if (Array.isArray(m)) setAllMachines(m as AssetMachine[]);
        if (Array.isArray(pl)) setPlants(pl as PlantRecord[]);
        if (Array.isArray(us)) setUsers(us as UserRecord[]);
        if (Array.isArray(rl)) setRoles(rl as RoleRecord[]);
        if (Array.isArray(h) && Array.isArray(m)) {
          writeSnapshot({
            hierarchy: h,
            machines: m,
            plants: Array.isArray(pl) ? pl : undefined,
            users: Array.isArray(us) ? us : undefined,
          });
        }
        setHasLoaded(true);
      });
      const [rk, fl, hl] = await Promise.all([
        // Every rack_chassis row (Configure lists all gateways), not just the selection's.
        loadData("racks", "/api/racks", failed),
        loadData("fleet", "/api/fleet", failed),
        loadData("database", "/api/db/init", failed),
        core,
        loadMachineData(selectedRef.current),
      ]);

      if (Array.isArray(rk)) setRacks(rk as RackChassisRecord[]);
      if (fl) setFleetStats(fl as FleetStats);
      if (hl) {
        setDatabaseStatus(hl as DatabaseStatus);
        setIsDbLive((hl as DatabaseStatus).connected === true);
      } else {
        setIsDbLive(false);
      }
      setLoadError(failed.length > 0 ? failed.join(" · ") : null);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [loadMachineData]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Reseed database trigger
  const reseedDatabase = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/db/init", { method: "POST" });
      const json = await res.json();
      if (json.data?.success) {
        await refreshData();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Reseed failed:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  // Signed-in user & plant access scoping
  const currentUserId = useMemo(() => {
    if (auth.status !== "signedIn" || !auth.userId) return null;
    return users.some((u) => u.id === auth.userId) ? auth.userId : null;
  }, [users, auth]);

  const currentUser = useMemo(
    () => (currentUserId ? users.find((u) => u.id === currentUserId) ?? null : null),
    [users, currentUserId],
  );

  const setSelectedPlantId = useCallback((id: string) => {
    setStoredPlantId(id);
    try {
      localStorage.setItem(PLANT_KEY, id);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> => {
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = (await r.json().catch(() => null)) as { data?: { userId?: string }; error?: { message?: string } } | null;
      if (!r.ok || !body?.data?.userId) return { ok: false, message: body?.error?.message ?? "Sign-in failed." };
      // A fresh account opens on its own default plant.
      setStoredPlantId(null);
      try {
        localStorage.removeItem(PLANT_KEY);
      } catch {
        /* storage unavailable */
      }
      setSelectedMachineId(null);
      setActiveTab("home");
      setAuth({ status: "signedIn", userId: body.data.userId });
      return { ok: true };
    } catch {
      return { ok: false, message: "The server could not be reached." };
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setStoredPlantId(null);
    try {
      localStorage.removeItem(PLANT_KEY);
    } catch {
      /* storage unavailable */
    }
    setSelectedMachineId(null);
    setActiveTab("home");
    setAuth({ status: "signedOut", userId: null });
  }, []);

  // Scope hierarchy and machines by the active user's accessible plants
  const accessiblePlantIds = useMemo(() => {
    // Plant access rows scope every account, admins included: each plant (the kiln-seal
    // plant, the pyro line) is a separate workspace. No rows = unrestricted.
    if (!currentUser || currentUser.plantAccess.length === 0) {
      return null; // null = unrestricted across all plants
    }
    return new Set(currentUser.plantAccess.map((a) => a.plantId));
  }, [currentUser]);

  const hierarchy = useMemo(() => {
    if (!accessiblePlantIds) return allHierarchy;
    const filtered = allHierarchy.filter((p) => accessiblePlantIds.has(p.id));
    return filtered.length > 0 ? filtered : allHierarchy;
  }, [allHierarchy, accessiblePlantIds]);

  const machines = useMemo(() => {
    if (!accessiblePlantIds) return allMachines;
    const filtered = allMachines.filter((m) => !m.plantId || accessiblePlantIds.has(m.plantId));
    return filtered.length > 0 ? filtered : allMachines;
  }, [allMachines, accessiblePlantIds]);

  // Acquisition racks of the visible machines only: each plant is a separate workspace.
  const scopedRacks = useMemo(() => {
    if (!accessiblePlantIds) return racks;
    const visible = new Set(machines.map((m) => m.id));
    return racks.filter((r) => !r.machineId || visible.has(r.machineId));
  }, [racks, machines, accessiblePlantIds]);

  // Seamless cross-page machine navigator
  const navigateToMachine = useCallback((machineId: string, subPage: AssetsSubPage = "overview") => {
    setSelectedMachineId(machineId);
    setActiveSubPage(subPage);
    setActiveTab("assets");
  }, []);

  // Return to assets homepage
  const navigateToAssetsHome = useCallback(() => {
    setSelectedMachineId(null);
    setActiveTab("assets");
  }, []);

  // Plant switcher: the stored plant when it still exists, else user's default, else the first.
  const selectedPlantId = useMemo(() => {
    if (hierarchy.length === 0) return null;
    const has = (id: string | null | undefined) => Boolean(id && hierarchy.some((p) => p.id === id));
    if (has(storedPlantId)) return storedPlantId;
    if (has(currentUser?.defaultPlantId)) return currentUser!.defaultPlantId!;
    if (has(DEFAULT_PLANT)) return DEFAULT_PLANT;
    return hierarchy[0].id;
  }, [hierarchy, storedPlantId, currentUser]);

  // Selected Machine Context
  const selectedMachine = useMemo(() => {
    if (!selectedMachineId) return null;
    return machines.find((m) => m.id === selectedMachineId) ?? allMachines.find((m) => m.id === selectedMachineId) ?? null;
  }, [machines, allMachines, selectedMachineId]);

  // CRUD Mutations for Plants, Users, and Machines
  const createPlant = useCallback(
    async (input: CreatePlantInput) => {
      const created = await mutateApi<PlantRecord>("/api/plants", "POST", input);
      await refreshData();
      return created;
    },
    [refreshData],
  );

  const updatePlant = useCallback(
    async (id: string, patch: UpdatePlantInput) => {
      const updated = await mutateApi<PlantRecord>(`/api/plants/${encodeURIComponent(id)}`, "PATCH", patch);
      await refreshData();
      return updated;
    },
    [refreshData],
  );

  const deletePlant = useCallback(
    async (id: string) => {
      await mutateApi<{ id: string; deleted: boolean }>(`/api/plants/${encodeURIComponent(id)}`, "DELETE");
      await refreshData();
    },
    [refreshData],
  );

  const createUser = useCallback(
    async (input: CreateUserInput) => {
      const created = await mutateApi<UserRecord>("/api/users", "POST", input);
      await refreshData();
      return created;
    },
    [refreshData],
  );

  const updateUser = useCallback(
    async (id: string, patch: UpdateUserInput) => {
      const updated = await mutateApi<UserRecord>(`/api/users/${encodeURIComponent(id)}`, "PATCH", patch);
      await refreshData();
      return updated;
    },
    [refreshData],
  );

  const deleteUser = useCallback(
    async (id: string) => {
      await mutateApi<{ id: string; deleted: boolean }>(`/api/users/${encodeURIComponent(id)}`, "DELETE");
      await refreshData();
    },
    [refreshData],
  );

  const createMachine = useCallback(
    async (input: CreateMachineInput) => {
      const created = await mutateApi<AssetMachine>("/api/machines", "POST", input);
      await refreshData();
      return created;
    },
    [refreshData],
  );

  const deleteMachine = useCallback(
    async (id: string) => {
      await mutateApi<{ id: string; deleted: boolean }>(`/api/machines?id=${encodeURIComponent(id)}`, "DELETE");
      if (selectedMachineId === id) setSelectedMachineId(null);
      await refreshData();
    },
    [refreshData, selectedMachineId],
  );

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      activeSubPage,
      setActiveSubPage,
      selectedMachineId,
      setSelectedMachineId,
      navigateToMachine,
      navigateToAssetsHome,
      selectedPlantId,
      setSelectedPlantId,
      users,
      roles,
      plants,
      currentUserId,
      authStatus: auth.status,
      signIn,
      signOut,
      currentUser,
      hierarchy,
      allHierarchy,
      machines,
      allMachines,
      selectedMachine,
      signals,
      diagnosisRecords,
      trendRecords,
      racks: scopedRacks,
      fleetStats,
      databaseStatus,
      isLoading,
      hasLoaded,
      loadError: [loadError, machineLoadError].filter(Boolean).join(" · ") || null,
      isDbLive,
      refreshData,
      reseedDatabase,
      createPlant,
      updatePlant,
      deletePlant,
      createUser,
      updateUser,
      deleteUser,
      createMachine,
      deleteMachine,
    }),
    [
      activeTab,
      activeSubPage,
      selectedMachineId,
      navigateToMachine,
      navigateToAssetsHome,
      selectedPlantId,
      setSelectedPlantId,
      users,
      roles,
      plants,
      currentUserId,
      auth.status,
      signIn,
      signOut,
      currentUser,
      hierarchy,
      allHierarchy,
      machines,
      allMachines,
      selectedMachine,
      signals,
      diagnosisRecords,
      trendRecords,
      scopedRacks,
      fleetStats,
      databaseStatus,
      isLoading,
      hasLoaded,
      loadError,
      machineLoadError,
      isDbLive,
      refreshData,
      reseedDatabase,
      createPlant,
      updatePlant,
      deletePlant,
      createUser,
      updateUser,
      deleteUser,
      createMachine,
      deleteMachine,
    ]
  );

  return (
    <IndustrialDataContext.Provider value={value}>
      {children}
    </IndustrialDataContext.Provider>
  );
}

export function useIndustrialData(): IndustrialDataContextType {
  const context = useContext(IndustrialDataContext);
  if (!context) {
    throw new Error("useIndustrialData must be used within an IndustrialDataProvider");
  }
  return context;
}
