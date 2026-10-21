/**
 * JSON for frozen engine state. The engines keep a few values plain JSON
 * cannot carry (±Infinity "never" times, typed-array buffers, Sets); they are
 * written as tagged objects and restored on parse, so a snapshot taken on the
 * server thaws in the browser into exactly the same plant.
 * Pure TypeScript, no React.
 */

type Tagged =
  | { $n: "Infinity" | "-Infinity" | "NaN" }
  | { $set: unknown[] }
  | { $map: Array<[unknown, unknown]> }
  | { $ta: string; v: number[] };

const TYPED: Record<string, new (values: number[]) => ArrayBufferView> = {
  Float64Array,
  Float32Array,
  Int32Array,
  Int16Array,
  Int8Array,
  Uint32Array,
  Uint16Array,
  Uint8Array,
  Uint8ClampedArray,
};

function replacer(this: unknown, _key: string, value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : ({ $n: String(value) } as Tagged);
  if (value instanceof Set) return { $set: [...value] } as Tagged;
  if (value instanceof Map) return { $map: [...value] } as Tagged;
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return { $ta: value.constructor.name, v: Array.from(value as unknown as ArrayLike<number>) } as Tagged;
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const v = value as Record<string, unknown>;
  if ("$n" in v) return Number(v.$n);
  if ("$set" in v) return new Set(v.$set as unknown[]);
  if ("$map" in v) return new Map(v.$map as Array<[unknown, unknown]>);
  if ("$ta" in v && typeof v.$ta === "string" && TYPED[v.$ta]) return new TYPED[v.$ta](v.v as number[]);
  return value;
}

export const encodePlant = (value: unknown): string => JSON.stringify(value, replacer);
export const decodePlant = <T>(text: string): T => JSON.parse(text, reviver) as T;
