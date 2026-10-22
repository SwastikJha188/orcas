import type { Hono } from "hono";
import { assetImages } from "./asset-images";
import { assetiq } from "./assetiq";
import { auth } from "./auth";
import { cases } from "./cases";
import { catalog } from "./catalog";
import { db } from "./db";
import { demoRequests } from "./demo-requests";
import { diagnosis } from "./diagnosis";
import { diagrams } from "./diagrams";
import { edge } from "./edge";
import { faultLibrary } from "./fault-library";
import { findings } from "./findings";
import { fleet } from "./fleet";
import { health } from "./health";
import { healthModels } from "./health-models";
import { hierarchy } from "./hierarchy";
import { history } from "./history";
import { insights } from "./insights";
import { machines } from "./machines";
import { maintenance } from "./maintenance";
import { measurements } from "./measurements";
import { mqtt } from "./mqtt";
import { onboarding } from "./onboarding";
import { plant } from "./plant";
import { plants } from "./plants";
import { rackUnits } from "./rack-units";
import { readings } from "./readings";
import { references } from "./references";
import { roles } from "./roles";
import { sap } from "./sap";
import { settings } from "./settings";
import { signals } from "./signals";
import { simulation } from "./simulation";
import { simulations } from "./simulations";
import { support } from "./support";
import { trends } from "./trends";
import { users } from "./users";
import { workOrderPriorities } from "./work-order-priorities";
import { workOrders } from "./work-orders";

/** Every API group, mounted under /api/<path>. */
export const routes: [string, Hono][] = [
  ["/asset-images", assetImages],
  ["/assetiq", assetiq],
  ["/auth", auth],
  ["/cases", cases],
  ["/catalog", catalog],
  ["/db", db],
  ["/demo-requests", demoRequests],
  ["/diagnosis", diagnosis],
  ["/diagrams", diagrams],
  ["/edge", edge],
  ["/fault-library", faultLibrary],
  ["/findings", findings],
  ["/fleet", fleet],
  ["/health", health],
  ["/health-models", healthModels],
  ["/hierarchy", hierarchy],
  ["/history", history],
  ["/insights", insights],
  ["/machines", machines],
  ["/maintenance", maintenance],
  ["/measurements", measurements],
  ["/mqtt", mqtt],
  ["/onboarding", onboarding],
  ["/plant", plant],
  ["/plants", plants],
  ["/rack-units", rackUnits],
  ["/readings", readings],
  ["/references", references],
  ["/roles", roles],
  ["/sap", sap],
  ["/settings", settings],
  ["/signals", signals],
  ["/simulation", simulation],
  ["/simulations", simulations],
  ["/support", support],
  ["/trends", trends],
  ["/users", users],
  ["/work-order-priorities", workOrderPriorities],
  ["/work-orders", workOrders],
];
