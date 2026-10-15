"use client";

import React from "react";
import type { KilnSimulation } from "@/components/assets/kiln-seals-simulation";
import type { AssetMachine } from "../assets-data";
import { RackView } from "../rack-view";

/* ==========================================================================
   Machine › Rack (entry module)
   One page: "Is the acquisition hardware for this machine healthy and
   correctly configured?" RackView fetches everything itself (cabinet model,
   edge registry / MQTT, catalog, KLN simulation), so the page works on a
   cold deep link and for every machine. `simulation` is optional.
   ========================================================================== */

export function MachineRackTab({ machine, simulation }: { machine: AssetMachine; simulation?: KilnSimulation }) {
  return <RackView machine={machine} simulation={simulation} />;
}
