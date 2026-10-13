#!/usr/bin/env node
// Local MQTT broker for development: retained messages, QoS 1 and last wills,
// which is everything the ultron/v1 contract relies on. Not for production —
// use EMQX (or any MQTT 5 broker) with per-gateway ACLs there.
//
//   npm run mqtt:broker            # mqtt://127.0.0.1:1883

import net from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createBroker } = require("aedes");

const PORT = Number(process.env.MQTT_PORT ?? 1883);
const broker = await createBroker();
const server = net.createServer(broker.handle);

broker.on("client", (c) => console.log(`[broker] + ${c.id}`));
broker.on("clientDisconnect", (c) => console.log(`[broker] - ${c.id}`));
broker.on("subscribe", (subs, c) => console.log(`[broker] ${c?.id} subscribed ${subs.map((s) => s.topic).join(", ")}`));

server.listen(PORT, "127.0.0.1", () => console.log(`[broker] listening on mqtt://127.0.0.1:${PORT}`));

const stop = () => server.close(() => broker.close(() => process.exit(0)));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
