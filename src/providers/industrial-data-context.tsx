"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
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

  // Data from PostgreSQL
  hierarchy: HierarchyNode[];
  machines: AssetMachine[];
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
}

const PLANT_KEY = "ultron.home.plant";
const DEFAULT_PLANT = "plant-kln";

const IndustrialDataContext = createContext<IndustrialDataContextType | undefined>(undefined);

export function IndustrialDataProvider({ children }: { children: React.ReactNode }) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("home");
  const [activeSubPage, setActiveSubPage] = useState<AssetsSubPage>("overview");
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [storedPlantId, setStoredPlantId] = useState<string | null>(null);
  useEffect(() => {
    try {
      setStoredPlantId(localStorage.getItem(PLANT_KEY));
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Industrial data from PostgreSQL only. Everything starts empty; if a request
  // fails, the matching collection stays empty and `loadError` names it.
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [machines, setMachines] = useState<AssetMachine[]>([]);
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

  // Fetch all live data from PostgreSQL API routes
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const failed: string[] = [];
    // Each request resolves to its `data` or null; failures are recorded, never papered over.
    const load = async (name: string, url: string): Promise<unknown> => {
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
    };
    try {
      const q = selectedMachineId ? `?machineId=${encodeURIComponent(selectedMachineId)}` : null;
      const [h, m, sig, diag, tr, rk, fl, hl] = await Promise.all([
        load("hierarchy", "/api/hierarchy"),
        load("machines", "/api/machines"),
        q ? load("signals", `/api/signals${q}`) : Promise.resolve([]),
        q ? load("diagnosis", `/api/diagnosis${q}`) : Promise.resolve([]),
        q ? load("trends", `/api/trends${q}`) : Promise.resolve([]),
        // Every rack_chassis row (Configure lists all gateways), not just the selection's.
        load("racks", "/api/racks"),
        load("fleet", "/api/fleet"),
        load("database", "/api/db/init"),
      ]);

      if (Array.isArray(h)) setHierarchy(h as HierarchyNode[]);
      if (Array.isArray(m)) setMachines(m as AssetMachine[]);
      if (Array.isArray(sig)) setSignals(sig as MappedSignal[]);
      if (Array.isArray(diag)) setDiagnosisRecords(diag as DiagnosisRecord[]);
      if (Array.isArray(tr)) setTrendRecords(tr as MachineTrendRecord[]);
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
  }, [selectedMachineId]);

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

  // Plant switcher: the stored plant when it still exists, else the default, else the first.
  const selectedPlantId = useMemo(() => {
    if (hierarchy.length === 0) return null;
    const has = (id: string | null) => Boolean(id && hierarchy.some((p) => p.id === id));
    if (has(storedPlantId)) return storedPlantId;
    if (has(DEFAULT_PLANT)) return DEFAULT_PLANT;
    return hierarchy[0].id;
  }, [hierarchy, storedPlantId]);

  const setSelectedPlantId = useCallback((id: string) => {
    setStoredPlantId(id);
    try {
      localStorage.setItem(PLANT_KEY, id);
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Selected Machine Context
  const selectedMachine = useMemo(() => {
    if (!selectedMachineId) return null;
    return machines.find((m) => m.id === selectedMachineId) ?? null;
  }, [machines, selectedMachineId]);

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
      hierarchy,
      machines,
      selectedMachine,
      signals,
      diagnosisRecords,
      trendRecords,
      racks,
      fleetStats,
      databaseStatus,
      isLoading,
      hasLoaded,
      loadError,
      isDbLive,
      refreshData,
      reseedDatabase,
    }),
    [
      activeTab,
      activeSubPage,
      selectedMachineId,
      navigateToMachine,
      navigateToAssetsHome,
      selectedPlantId,
      setSelectedPlantId,
      hierarchy,
      machines,
      selectedMachine,
      signals,
      diagnosisRecords,
      trendRecords,
      racks,
      fleetStats,
      databaseStatus,
      isLoading,
      hasLoaded,
      loadError,
      isDbLive,
      refreshData,
      reseedDatabase,
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
