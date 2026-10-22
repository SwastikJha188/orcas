/**
 * SAP S/4HANA integration (ported from the ULTRON console). The resources,
 * editions and sign-in methods are lookup rows (migration 058); these types
 * only name them.
 */

export const SAP_RESOURCE_NAMES = ["equipment", "notifications", "maintenanceOrders", "orderComponents", "materials", "materialStock", "measuringPoints", "measurementDocuments", "productionOrders"] as const;

export type SapResourceName = (typeof SAP_RESOURCE_NAMES)[number];
export type SapAuthType = "oauth_client_credentials" | "basic";

export type SapCredentials = {
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  scope?: string;
};

/** One OData entity set ULTRON reads (sap_resources). */
export interface SapResource {
  id: SapResourceName;
  label: string;
  apiName: string;
  defaultPath: string;
  keyFields: string[];
  writeAction: string | null;
}

/** The plant's SAP system with its credentials: server only. */
export interface SapConnection {
  id: string;
  plantId: string;
  name: string;
  editionId: string;
  baseUrl: string;
  authType: SapAuthType;
  tokenUrl: string | null;
  credentials: SapCredentials;
  sapPlant: string | null;
  notificationType: string;
  enabled: boolean;
  /** Resource → path on this SAP system (standard path unless overridden). */
  paths: Record<SapResourceName, string>;
}

/** What the browser may see of a connection: never the credentials. */
export interface PublicSapConnection {
  id: string;
  plantId: string;
  name: string;
  editionId: string;
  baseUrl: string;
  authType: SapAuthType;
  tokenUrl: string | null;
  sapPlant: string | null;
  notificationType: string;
  /** Minutes between automatic syncs / reading publishes; null = only by hand. */
  syncEveryMin: number | null;
  publishEveryMin: number | null;
  enabled: boolean;
  /** Overridden paths only. */
  paths: Partial<Record<SapResourceName, string>>;
  credentialStatus: "configured" | "missing";
  /** Who signs in: client id or user name (not secret). */
  credentialUser: string | null;
  lastTest: { at: string; ok: boolean; message: string | null } | null;
  updatedAt: string;
}

export interface SapConnectionInput {
  plantId: string;
  name: string;
  editionId: string;
  baseUrl: string;
  authType: SapAuthType;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  scope?: string;
  sapPlant?: string;
  notificationType?: string;
  syncEveryMin?: number | null;
  publishEveryMin?: number | null;
  paths?: Partial<Record<SapResourceName, string>>;
  enabled?: boolean;
}

export type SapODataPage = {
  records: Record<string, unknown>[];
  nextLink: string | null;
  count: number | null;
};

/** A failed exchange with SAP (or missing server set-up): its HTTP status for the API answer. */
export class SapError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
