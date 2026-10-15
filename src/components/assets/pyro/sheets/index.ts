/** The 11 ULTRON machine diagram sheets of D4-OSW-PE-PYR Rev. 02, by sheet id. */
import type { PyroSheetDrawing } from "./sheet-types";
import { sheet as d01 } from "./d01";
import { sheet as d02 } from "./d02";
import { sheet as d03 } from "./d03";
import { sheet as d04 } from "./d04";
import { sheet as d05 } from "./d05";
import { sheet as d06 } from "./d06";
import { sheet as d07 } from "./d07";
import { sheet as d08 } from "./d08";
import { sheet as d09 } from "./d09";
import { sheet as d10 } from "./d10";
import { sheet as d11 } from "./d11";

export type { PyroSheetDrawing };

export const PYRO_SHEETS: Record<string, PyroSheetDrawing> = Object.fromEntries([d01, d02, d03, d04, d05, d06, d07, d08, d09, d10, d11].map((s) => [s.sheet, s]));
