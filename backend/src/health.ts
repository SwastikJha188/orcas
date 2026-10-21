import { isDatabaseHealthy } from "./db";

export type HealthStatus = {
  service: "ultron-api";
  status: "ok" | "degraded";
  timestamp: string;
  database: Awaited<ReturnType<typeof isDatabaseHealthy>>;
};

export async function getHealthStatus(): Promise<HealthStatus> {
  const dbHealth = await isDatabaseHealthy();
  return {
    service: "ultron-api",
    status: dbHealth.connected ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbHealth,
  };
}
