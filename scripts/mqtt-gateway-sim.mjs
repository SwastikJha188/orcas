#!/usr/bin/env node
// Development gateways: simulates the edge registry's topology on one broker
// and publishes the ultron/v1 v2.0 contract exactly as ULTRON gateways do.
//
// The registry is read from the running app (GET /api/edge). The broker is
// BROKER_ID, else the registry broker whose host:port matches MQTT_URL, else
// `brk-local`. Every enabled gateway on that broker gets its own connection
// (client id `ultron-gw-<code>`, own boot id and gateway_sequence, retained
// OFFLINE last will) and publishes, under the broker's topic prefix:
// retained status, topology, and per source (`racks/<source.code>`) retained
// health + inventory (one entry per card, typed from the registry's cards or
// the source kind), telemetry for every enabled point (slot / channel) and
// edge-triggered alarms. One point per gateway drifts through its alert and
// danger limits so alarms fire and clear. PING is answered on commands/request.
//
// A gateway whose data format (Devices › Data formats) is JSON publishes in
// that layout instead — the inverse of src/lib/edge-format, best effort: the
// topic template's {gateway} {rack} {card} {channel} are filled in, the
// records path is built back up (one message per channel for an empty path,
// nested arrays / object maps for `racks[*].cards[*].channels[*]`, `data`, …)
// and every simple field path is set on its record. No ULTRON status, will or
// commands for those. A JSON gateway with no points registered yet publishes a
// small made-up rack (R1 · cards AI-1, AI-2 · four channels) to discover.
//
//   npm run mqtt:sim
//   BROKER_ID=brk-local npm run mqtt:sim
//   APP_URL=http://localhost:3000 MQTT_URL=mqtt://127.0.0.1:1883 npm run mqtt:sim
//   TELEMETRY_INTERVAL_MS=500 npm run mqtt:sim
//   SIM_FAULTS=1 npm run mqtt:sim     # also publish the odd invalid message, to exercise quarantine
//
// If the registry cannot be read, one built-in gateway `gw-dev01` with rack
// `Rack-A` and five channels is simulated instead.

import { randomUUID } from "node:crypto";
import mqtt from "mqtt";

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const MQTT_URL = process.env.MQTT_URL;
const BROKER_ID = process.env.BROKER_ID;
const INTERVAL_MS = Number(process.env.TELEMETRY_INTERVAL_MS ?? 1000);
const FAULTS = process.env.SIM_FAULTS === "1";
const DEFAULT_PREFIX = "ultron/v1/gateways";

// ---------------------------------------------------------------- topology
/** Built-in gateway for when the registry is unreachable. */
const FALLBACK = {
  prefix: DEFAULT_PREFIX,
  url: MQTT_URL ?? "mqtt://127.0.0.1:1883",
  gateways: [
    {
      code: "gw-dev01",
      ip: "192.168.30.11",
      sources: [
        {
          code: "Rack-A",
          kind: "rack",
          points: [
            { slot: 1, channel: 1, name: "Bearing DE velocity", card: "Vibration", unit: "mm/s", alert: 7.1, danger: 11.2, dataType: "float" },
            { slot: 2, channel: 1, name: "Bearing NDE velocity", card: "Vibration", unit: "mm/s", alert: 7.1, danger: 11.2, dataType: "float" },
            { slot: 3, channel: 1, name: "Shell temperature", card: "Process", unit: "°C", alert: 350, danger: 375, dataType: "float" },
            { slot: 4, channel: 1, name: "Drive current", card: "Process", unit: "A", alert: 520, danger: 580, dataType: "float" },
            { slot: 5, channel: 1, name: "Kiln speed", card: "Speed", unit: "rpm", alert: null, danger: null, dataType: "float" },
          ],
        },
      ],
    },
  ],
};

/** What a JSON-format gateway with nothing registered publishes, so it can be discovered. */
const DISCOVERY_SOURCES = [
  {
    code: "R1",
    kind: "rack",
    points: [
      { slot: "AI-1", channel: "1", name: "Bearing DE velocity", card: "AI", unit: "mm/s", alert: 7.1, danger: 11.2, dataType: "float" },
      { slot: "AI-1", channel: "2", name: "Bearing NDE velocity", card: "AI", unit: "mm/s", alert: 7.1, danger: 11.2, dataType: "float" },
      { slot: "AI-2", channel: "TT-101", name: "Outlet temperature", card: "RTD", unit: "°C", alert: 120, danger: 140, dataType: "float" },
      { slot: "AI-2", channel: "PT-102", name: "Inlet pressure", card: "AI", unit: "bar", alert: null, danger: null, dataType: "float" },
    ],
  },
];

const isIPv4 = (v) =>
  typeof v === "string" && v.split(".").length === 4 && v.split(".").every((o) => /^(0|[1-9]\d{0,2})$/.test(o) && Number(o) <= 255);

const normalizePrefix = (p) => (p ?? "").trim().replace(/^\/+|\/+$/g, "") || DEFAULT_PREFIX;

function hostPort(url) {
  try {
    const u = new URL(url);
    const host = u.hostname === "localhost" ? "127.0.0.1" : u.hostname;
    return `${host}:${u.port || (u.protocol === "mqtts:" ? 8883 : 1883)}`;
  } catch {
    return null;
  }
}

/**
 * Alert / danger level of each linked measurement, from its own limit (a point
 * has no limits of its own), so the simulated values cross them now and then.
 */
async function loadLimits(points) {
  const out = new Map();
  for (const machineId of new Set(points.map((p) => p.machineId).filter(Boolean))) {
    try {
      const res = await fetch(`${APP_URL}/api/measurements?machineId=${encodeURIComponent(machineId)}`, { signal: AbortSignal.timeout(5000) });
      for (const m of (await res.json())?.data ?? []) {
        const l = m.limit;
        if (!l || l.direction === "lo") continue; // the simulator only pushes values upward
        const alert = l.warnValue ?? l.warnHi ?? null;
        const danger = l.alarmValue ?? l.alarmHi ?? null;
        if (alert !== null || danger !== null) out.set(m.id, { alert, danger });
      }
    } catch (err) {
      console.warn(`[sim] limits of ${machineId} unavailable (${err.message}); its points publish without thresholds.`);
    }
  }
  return out;
}

async function loadTopology() {
  let registry;
  try {
    const res = await fetch(`${APP_URL}/api/edge`, { signal: AbortSignal.timeout(5000) });
    const body = await res.json();
    if (!res.ok || !body?.data) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
    registry = body.data;
  } catch (err) {
    console.warn(`[sim] cannot read the edge registry from ${APP_URL}/api/edge (${err.message}).`);
    console.warn("[sim] is the app running? Falling back to the built-in gateway gw-dev01 · Rack-A.");
    return FALLBACK;
  }

  const brokers = registry.brokers ?? [];
  const norm = (h) => (h === "localhost" ? "127.0.0.1" : h);
  const wanted = MQTT_URL ? hostPort(MQTT_URL) : null;
  const broker =
    (BROKER_ID && brokers.find((b) => b.id === BROKER_ID)) ||
    (!BROKER_ID && wanted && brokers.find((b) => `${norm(b.host)}:${b.port}` === wanted)) ||
    (!BROKER_ID && brokers.find((b) => b.id === "brk-local"));
  if (!broker) {
    console.warn(`[sim] no registry broker matches ${BROKER_ID ? `BROKER_ID=${BROKER_ID}` : MQTT_URL ?? "brk-local"}; falling back to gw-dev01.`);
    return FALLBACK;
  }
  if (!broker.enabled) console.warn(`[sim] broker ${broker.id} is disabled in the registry; the app will not read what this publishes until it is enabled.`);

  const limits = await loadLimits(registry.points ?? []);
  const formats = new Map((registry.formats ?? []).map((f) => [f.id, f]));
  // Card types from the registry's cards (source + card code), else the source kind.
  const cardTypes = new Map((registry.cards ?? []).filter((c) => c.cardType).map((c) => [`${c.sourceId}\u0000${c.code}`, c.cardType]));
  const gateways = (registry.gateways ?? [])
    .filter((g) => g.enabled && g.brokerId === broker.id)
    .map((g, i) => {
      const format = g.formatId ? formats.get(g.formatId) : null;
      const json = format?.kind === "json" ? format : null;
      const sources = (registry.sources ?? [])
        .filter((s) => s.enabled && s.gatewayId === g.id)
        .map((s) => ({
          code: s.code,
          kind: s.kind,
          points: (registry.points ?? [])
            .filter((p) => p.enabled && p.sourceId === s.id)
            .filter((p) => {
              // The ULTRON contract numbers slots from 1; a JSON format takes any card id.
              if (json || /^[1-9]\d*$/.test(String(p.slot))) return true;
              console.warn(`[sim] ${g.code}/${s.code} point ${p.tag} has card “${p.slot}”; the ULTRON contract needs slot numbers from 1, skipped.`);
              return false;
            })
            .map((p) => ({
              slot: json ? String(p.slot) : Number(p.slot),
              channel: json ? String(p.channel) : /^\d+$/.test(String(p.channel)) ? Number(p.channel) : String(p.channel),
              name: p.name,
              card: cardTypes.get(`${s.id}\u0000${p.slot}`) ?? s.kind,
              unit: p.unit ?? "",
              alert: limits.get(p.measurementId)?.alert ?? null,
              danger: limits.get(p.measurementId)?.danger ?? null,
              dataType: p.dataType,
            })),
        }));
      return {
        code: g.code,
        ip: isIPv4(g.ipAddress) ? g.ipAddress : `192.168.30.${11 + i}`,
        format: json,
        sources: json && !sources.some((s) => s.points.length) ? DISCOVERY_SOURCES : sources,
      };
    });
  if (gateways.length === 0) {
    console.warn(`[sim] broker ${broker.id} has no enabled gateways in the registry; falling back to gw-dev01.`);
    return { ...FALLBACK, prefix: normalizePrefix(broker.topicPrefix), url: MQTT_URL ?? `${broker.tls ? "mqtts" : "mqtt"}://${broker.host}:${broker.port}` };
  }
  return {
    prefix: normalizePrefix(broker.topicPrefix),
    url: MQTT_URL ?? `${broker.tls ? "mqtts" : "mqtt"}://${broker.host}:${broker.port}`,
    gateways,
    brokerId: broker.id,
  };
}

// ---------------------------------------------------------------- values
/** A stable resting value for a point without limits, by unit. */
const RESTING = { "mm/s": 2.4, "g": 0.8, "µm": 35, "um": 35, "°c": 120, "c": 120, "bar": 4.2, "mbar": -4, "kpa": 101, "pa": -350, "a": 310, "kw": 480, "mw": 4.8, "rpm": 3.6, "hz": 49.9, "%": 48, "t/h": 210, "m3/h": 120, "mm": 12, "v": 400, "ppm": 180 };

function profile(point, drifting) {
  const alert = typeof point.alert === "number" ? point.alert : null;
  const danger = typeof point.danger === "number" ? point.danger : null;
  const limit = alert ?? danger;
  if (point.dataType === "bool") return { base: 1, amp: 0, drift: null };
  if (limit !== null && limit > 0) {
    // Resting 55–65 % of the first limit; the drifting point sweeps from half
    // the limit to just past the highest one.
    const top = Math.max(alert ?? 0, danger ?? 0);
    return { base: 0.6 * limit, amp: 0.05 * limit, drift: drifting ? { lo: 0.5 * limit, hi: top * 1.08 } : null };
  }
  const resting = RESTING[(point.unit ?? "").trim().toLowerCase()] ?? 50;
  return { base: resting, amp: Math.abs(resting) * 0.02, drift: null };
}

function round(value, dataType) {
  if (dataType === "int" || dataType === "bool") return Math.round(value);
  const mag = Math.abs(value);
  return Number(value.toFixed(mag < 10 ? 3 : mag < 100 ? 2 : 1));
}

// ---------------------------------------------------------------- gateways
const topology = await loadTopology();
const PREFIX = topology.prefix;
const sims = [];

function createGateway(spec) {
  if (spec.format) return createJsonGateway(spec);
  const base = `${PREFIX}/${encodeURIComponent(spec.code)}`;
  const rackTopic = (rack, leaf) => `${base}/racks/${encodeURIComponent(rack)}/${leaf}`;
  const bootId = randomUUID();
  let sequence = 0;
  let timer = null;
  const alarmState = new Map();
  // The first point with a positive limit drifts; the rest rest.
  let driftKey = null;
  for (const s of spec.sources) {
    const p = s.points.find((pt) => (pt.alert ?? pt.danger ?? 0) > 0 && pt.dataType !== "bool");
    if (p) {
      driftKey = `${s.code}/${p.slot}/${p.channel}`;
      break;
    }
  }
  const profiles = new Map(
    spec.sources.flatMap((s) => s.points.map((p) => [`${s.code}/${p.slot}/${p.channel}`, profile(p, `${s.code}/${p.slot}/${p.channel}` === driftKey)])),
  );

  function envelope(schema, rackId, payload) {
    const nowUs = BigInt(Date.now()) * 1000n;
    return {
      schema,
      schema_version: "2.0",
      message_id: randomUUID(),
      gateway_id: spec.code,
      gateway_boot_id: bootId,
      gateway_ip: spec.ip,
      gateway_sequence: ++sequence,
      created_at: new Date().toISOString(),
      created_at_us: String(nowUs),
      replayed: false,
      ...(rackId ? { rack_id: rackId } : {}),
      payload,
    };
  }

  const will = envelope("ultron.gateway.status", null, { state: "OFFLINE", mqtt_state: "DISCONNECTED", reason: "unexpected_disconnect" });
  const client = mqtt.connect(topology.url, {
    clientId: `ultron-gw-${spec.code}`,
    clean: true,
    reconnectPeriod: 2000,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    will: { topic: `${base}/status`, payload: JSON.stringify(will), qos: 1, retain: true },
  });

  function publish(topic, message, { qos = 0, retain = false } = {}) {
    if (!client.connected) return;
    client.publish(topic, typeof message === "string" ? message : JSON.stringify(message), { qos, retain });
  }

  function edgeAlarm(rack, p, value, severity) {
    const key = `${rack}/${p.slot}/${p.channel}`;
    const prev = alarmState.get(key) ?? null;
    if (prev === severity) return;
    alarmState.set(key, severity);
    const state = severity ? "ACTIVE" : "CLEARED";
    const level = severity ?? prev;
    publish(rackTopic(rack, "events/alarm"), envelope("ultron.event.alarm", rack, {
      alarm_id: `ALM-${p.slot}-${p.channel}`,
      slot_number: p.slot,
      channel_id: p.channel,
      severity: level,
      state,
      value,
      threshold: level === "CRITICAL" ? p.danger : p.alert,
      unit: p.unit,
      message: `${p.name} ${state === "ACTIVE" ? "above" : "back below"} ${level === "CRITICAL" ? "danger" : "alert"} limit`,
    }), { qos: 1 });
  }

  function readings(source, t) {
    return source.points.map((p, i) => {
      const prof = profiles.get(`${source.code}/${p.slot}/${p.channel}`);
      const raw = prof.drift
        ? prof.drift.lo + (prof.drift.hi - prof.drift.lo) * (1 - Math.cos(t / 15)) / 2
        : prof.base + prof.amp * (Math.sin(t / 3 + i) * 0.6 + (Math.random() - 0.5) * 0.8);
      const value = round(raw, p.dataType);
      const alert = typeof p.alert === "number" && value >= p.alert;
      const danger = typeof p.danger === "number" && value >= p.danger;
      edgeAlarm(source.code, p, value, danger ? "CRITICAL" : alert ? "WARNING" : null);
      return {
        slot_number: p.slot,
        channel_id: p.channel,
        card_type: p.card,
        sensor: p.name,
        value,
        value_formatted: String(value),
        value_display: String(value),
        value_with_unit: p.unit ? `${value} ${p.unit}` : String(value),
        unit: p.unit,
        measurement_valid: true,
        quality: "GOOD",
        freshness: "FRESH",
        channel_status: "ok",
        alert_threshold: p.alert ?? null,
        danger_threshold: p.danger ?? null,
        alert_state: alert ? "ACTIVE" : "INACTIVE",
        danger_state: danger ? "ACTIVE" : "INACTIVE",
      };
    });
  }

  function publishState() {
    publish(`${base}/status`, envelope("ultron.gateway.status", null, { state: "ONLINE", mqtt_state: "CONNECTED" }), { qos: 1, retain: true });
    publish(`${base}/topology`, envelope("ultron.gateway.topology", null, {
      racks: spec.sources.map((s) => ({ rack_id: s.code, status: "connected", data_current: true })),
    }), { qos: 1, retain: true });
    for (const s of spec.sources) {
      const slots = [...new Set(s.points.map((p) => p.slot))].sort((a, b) => a - b);
      publish(rackTopic(s.code, "health"), envelope("ultron.rack.health", s.code, { rack_id: s.code, status: "connected", data_current: true }), { qos: 1, retain: true });
      publish(rackTopic(s.code, "inventory"), envelope("ultron.rack.inventory", s.code, {
        rack_id: s.code,
        snapshot_revision: 1,
        slot_count: slots.length,
        slots: slots.map((slot) => ({ slot_number: slot, presence: "PRESENT", online_state: "ONLINE", card_type: s.points.find((p) => p.slot === slot)?.card ?? s.kind })),
      }), { qos: 1, retain: true });
    }
  }

  client.on("connect", () => {
    const points = spec.sources.reduce((n, s) => n + s.points.length, 0);
    console.log(`[sim] ${spec.code} connected to ${topology.url} · ${spec.sources.length} source(s): ${spec.sources.map((s) => s.code).join(", ") || "none"} · ${points} point(s)${driftKey ? ` · drifting ${driftKey}` : ""}`);
    client.subscribe(`${base}/racks/+/commands/request`, { qos: 1 });
    publishState();
    let t = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      t += 1;
      for (const s of spec.sources) {
        const slots = readings(s, t);
        publish(rackTopic(s.code, "telemetry"), envelope("ultron.rack.telemetry", s.code, {
          rack_id: s.code,
          slot_count: new Set(s.points.map((p) => p.slot)).size,
          slots,
          telemetry: { data_current: true },
        }));
      }
      if (FAULTS && t % 40 === 0 && spec.sources.length) {
        const first = spec.sources[0].code;
        // Identity mismatch: claims another rack in the envelope.
        publish(rackTopic(first, "telemetry"), envelope("ultron.rack.telemetry", "Rack-Z", { rack_id: "Rack-Z", slot_count: 0, slots: [] }));
        publish(rackTopic(first, "health"), "{not json");
      }
    }, INTERVAL_MS);
  });

  client.on("message", (topic, buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString("utf8"));
    } catch {
      return;
    }
    const rack = decodeURIComponent(topic.slice(base.length + 1).split("/")[1] ?? "");
    const requestId = msg?.payload?.request_id;
    if (typeof requestId !== "string") return;
    const command = msg.payload.command;
    console.log(`[sim] ${spec.code} command ${command} for ${rack} (${requestId})`);
    const payload = command === "PING"
      ? { request_id: requestId, status: "COMPLETED", result: { pong: true } }
      : { request_id: requestId, status: "REJECTED", message: `unsupported command: ${command}` };
    publish(rackTopic(rack, "commands/response"), envelope("ultron.command.response", rack, payload), { qos: 1 });
  });

  client.on("error", (err) => console.error(`[sim] ${spec.code}`, err.message));

  return {
    stop: () =>
      new Promise((resolve) => {
        clearInterval(timer);
        // A clean stop publishes OFFLINE itself; the will is only for a crash.
        publish(`${base}/status`, envelope("ultron.gateway.status", null, { state: "OFFLINE", mqtt_state: "DISCONNECTED", reason: "shutdown" }), { qos: 1, retain: true });
        client.end(false, {}, resolve);
      }),
  };
}

// ---------------------------------------------------------------- JSON formats
/** "racks[*].cards[*].channels[*]" → [{ key: "racks", arr: true }, …]; the last step always fans out. */
function recordSteps(path) {
  const parts = path.trim().replace(/^\$\.?/, "").split(".").filter(Boolean);
  return parts.map((part, i) => {
    const m = /^([^[\]]+)((?:\[(?:\*|\d+)\])*)$/.exec(part);
    const key = m ? m[1] : part;
    return { key, arr: (m?.[2] ?? "").includes("[*]") || i === parts.length - 1 };
  });
}

/** A field path the sim can write: a plain dotted key path (no literals, $key/$index, indexes). */
const writable = (path) => typeof path === "string" && /^[A-Za-z_][\w-]*(\.[A-Za-z_][\w-]*)*$/.test(path.trim());

function setPath(obj, path, value) {
  const keys = path.trim().split(".");
  let cur = obj;
  for (const k of keys.slice(0, -1)) cur = cur[k] && typeof cur[k] === "object" ? cur[k] : (cur[k] = {});
  cur[keys[keys.length - 1]] = value;
}

function stamp(format, ms) {
  switch (format) {
    case "iso":
      return new Date(ms).toISOString();
    case "epoch_ms":
      return ms;
    case "epoch_s":
      return Math.round(ms) / 1000;
    case "epoch_us":
      return ms * 1000;
    default:
      return undefined;
  }
}

function groupBy(items, key) {
  const out = new Map();
  for (const it of items) {
    const k = key ? it[key] : "";
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(it);
  }
  return out;
}

/**
 * Builds publishable messages ({ topic, payload }) for one tick of readings
 * ({ rack, card, channel, value, unit, name, cardType, alert, danger }).
 */
function jsonMessages(format, gatewayCode, readings) {
  const f = format.fields;
  const levels = format.topic.trim().split("/");
  const inTopic = new Set(levels.map((l) => /^\{(rack|card|channel)\}$/.exec(l)?.[1]).filter(Boolean));
  const topicFor = (r) =>
    levels
      .filter((l, i) => !(l === "#" && i === levels.length - 1))
      .map((l) => {
        const m = /^\{(gateway|rack|card|channel)\}$/.exec(l);
        if (!m) return l === "+" ? "data" : l;
        return encodeURIComponent(m[1] === "gateway" ? gatewayCode : r[m[1]]);
      })
      .join("/");

  const now = Date.now();
  const leaf = (r, skipIds) => {
    const rec = {};
    const put = (path, v) => {
      if (v !== undefined && v !== null && writable(path)) setPath(rec, path, v);
    };
    for (const id of ["rack", "card", "channel"]) if (!skipIds.has(id)) put(f[id], r[id]);
    put(f.value, r.value);
    put(f.unit, r.unit || undefined);
    put(f.name, r.name);
    put(f.cardType, r.cardType);
    put(f.quality, true);
    put(f.timestamp, stamp(format.timestampFormat, now));
    put(f.alert, r.alert);
    put(f.danger, r.danger);
    return rec;
  };
  const scalarLeaf = !f.value.trim() || f.value.trim() === "$value";

  // One reading per message: the payload is the record (or the bare value).
  if (!format.records.trim()) {
    return readings.map((r) => ({ topic: topicFor(r), payload: scalarLeaf ? String(r.value) : JSON.stringify(leaf(r, new Set())) }));
  }

  const steps = recordSteps(format.records);
  const arrays = steps.map((s, i) => (s.arr ? i : -1)).filter((i) => i >= 0);
  const upper = arrays.slice(0, -1);
  // Which id each upper array level groups by: a key that names it, else outermost first.
  const free = ["rack", "card"].filter((id) => !inTopic.has(id));
  const levelId = new Map();
  for (const i of upper) {
    const named = free.find((id) => steps[i].key.toLowerCase().includes(id === "card" ? "card" : "rack") || (id === "card" && /slot|module/i.test(steps[i].key)));
    const id = named ?? free[0];
    if (id) {
      levelId.set(i, id);
      free.splice(free.indexOf(id), 1);
    }
  }
  const onUpper = new Set(levelId.values());

  const valueFor = (i, rs) => {
    const step = steps[i];
    if (!step.arr) return { [steps[i + 1].key]: valueFor(i + 1, rs) };
    if (i === steps.length - 1) {
      const skip = new Set([...inTopic, ...onUpper]);
      if (f.channel.trim() === "$key") {
        return Object.fromEntries(rs.map((r) => [r.channel, scalarLeaf ? r.value : leaf(r, new Set([...skip, "channel"]))]));
      }
      return rs.map((r) => leaf(r, skip));
    }
    const id = levelId.get(i);
    const groups = [...groupBy(rs, id).entries()];
    const asMap = id && f[id].trim() === "$key";
    const elements = groups.map(([key, group]) => {
      const el = {};
      if (id && writable(f[id])) setPath(el, f[id], key);
      el[steps[i + 1].key] = valueFor(i + 1, group);
      return [key, el];
    });
    return asMap ? Object.fromEntries(elements) : elements.map(([, el]) => el);
  };

  const byTopic = groupBy(readings.map((r) => ({ ...r, __topic: topicFor(r) })), "__topic");
  return [...byTopic.entries()].map(([topic, rs]) => ({ topic, payload: JSON.stringify({ [steps[0].key]: valueFor(0, rs) }) }));
}

function createJsonGateway(spec) {
  const format = spec.format;
  let timer = null;
  const drifting = (() => {
    for (const s of spec.sources) {
      const p = s.points.find((pt) => (pt.alert ?? pt.danger ?? 0) > 0 && pt.dataType !== "bool");
      if (p) return `${s.code}/${p.slot}/${p.channel}`;
    }
    return null;
  })();
  const profiles = new Map(
    spec.sources.flatMap((s) => s.points.map((p) => [`${s.code}/${p.slot}/${p.channel}`, profile(p, `${s.code}/${p.slot}/${p.channel}` === drifting)])),
  );
  const client = mqtt.connect(topology.url, {
    clientId: `ultron-gw-${spec.code}`,
    clean: true,
    reconnectPeriod: 2000,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
  });

  client.on("connect", () => {
    const points = spec.sources.reduce((n, s) => n + s.points.length, 0);
    console.log(
      `[sim] ${spec.code} connected to ${topology.url} · format “${format.name}” (${format.topic} · records “${format.records}”) · ${spec.sources.length} source(s), ${points} point(s)${drifting ? ` · drifting ${drifting}` : ""}`,
    );
    let t = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      t += 1;
      const readings = spec.sources.flatMap((s) =>
        s.points.map((p, i) => {
          const prof = profiles.get(`${s.code}/${p.slot}/${p.channel}`);
          const raw = prof.drift
            ? prof.drift.lo + (prof.drift.hi - prof.drift.lo) * (1 - Math.cos(t / 15)) / 2
            : prof.base + prof.amp * (Math.sin(t / 3 + i) * 0.6 + (Math.random() - 0.5) * 0.8);
          return { rack: s.code, card: String(p.slot), channel: String(p.channel), value: round(raw, p.dataType), unit: p.unit, name: p.name, cardType: p.card, alert: p.alert ?? null, danger: p.danger ?? null };
        }),
      );
      for (const m of jsonMessages(format, spec.code, readings)) client.publish(m.topic, m.payload, { qos: 0 });
      if (FAULTS && t % 40 === 0 && readings.length) client.publish(jsonMessages(format, spec.code, readings.slice(0, 1))[0].topic, "{not json");
    }, INTERVAL_MS);
  });
  client.on("error", (err) => console.error(`[sim] ${spec.code}`, err.message));

  return {
    stop: () =>
      new Promise((resolve) => {
        clearInterval(timer);
        client.end(false, {}, resolve);
      }),
  };
}

console.log(`[sim] ${topology.brokerId ? `broker ${topology.brokerId}` : "built-in topology"} · ${topology.url} · prefix ${PREFIX} · ${topology.gateways.length} gateway(s)`);
for (const spec of topology.gateways) sims.push(createGateway(spec));

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const force = setTimeout(() => process.exit(0), 3000);
  await Promise.all(sims.map((s) => s.stop()));
  clearTimeout(force);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
