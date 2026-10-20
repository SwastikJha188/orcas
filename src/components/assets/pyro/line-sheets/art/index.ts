/** Drawings of the 37 pyro-line diagram sheets, by sheet id. */
import type { LineSheetArt } from "../types";
import { sheet as pyr0 } from "./pyr0";
import { sheet as f0 } from "./f0";
import { sheet as f1 } from "./f1";
import { sheet as f2 } from "./f2";
import { sheet as f3 } from "./f3";
import { sheet as f4 } from "./f4";
import { sheet as f5 } from "./f5";
import { sheet as f6 } from "./f6";
import { sheet as f7 } from "./f7";
import { sheet as p0 } from "./p0";
import { sheet as p1 } from "./p1";
import { sheet as p2 } from "./p2";
import { sheet as p3 } from "./p3";
import { sheet as p4 } from "./p4";
import { sheet as p5 } from "./p5";
import { sheet as g1 } from "./g1";
import { sheet as g2 } from "./g2";
import { sheet as k0 } from "./k0";
import { sheet as k1 } from "./k1";
import { sheet as k2 } from "./k2";
import { sheet as k3 } from "./k3";
import { sheet as k4 } from "./k4";
import { sheet as k5 } from "./k5";
import { sheet as k6 } from "./k6";
import { sheet as k7 } from "./k7";
import { sheet as k8 } from "./k8";
import { sheet as k9 } from "./k9";
import { sheet as b0 } from "./b0";
import { sheet as b1 } from "./b1";
import { sheet as b2 } from "./b2";
import { sheet as b3 } from "./b3";
import { sheet as b4 } from "./b4";
import { sheet as c0 } from "./c0";
import { sheet as c1 } from "./c1";
import { sheet as c2 } from "./c2";
import { sheet as c3 } from "./c3";
import { sheet as c4 } from "./c4";
import { sheet as c5 } from "./c5";
import { sheet as h0 } from "./h0";
import { sheet as h1 } from "./h1";
import { sheet as h2 } from "./h2";
import { sheet as h3 } from "./h3";
import { v0, v1, v2, v3, v4, v5, v6, v7 } from "./v0";

export const LINE_SHEET_ART: Record<string, LineSheetArt> = Object.fromEntries(
  [pyr0, f0, f1, f2, f3, f4, f5, f6, f7, p0, p1, p2, p3, p4, p5, g1, g2, k0, k1, k2, k3, k4, k5, k6, k7, k8, k9, b0, b1, b2, b3, b4, c0, c1, c2, c3, c4, c5, h0, h1, h2, h3, v0, v1, v2, v3, v4, v5, v6, v7].map((s) => [s.id, s]),
);
