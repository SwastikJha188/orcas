import { Hono } from "hono";
import { fail, failFrom, readBody } from "./edge-respond";
import { accessFail, requestScope } from "@backend/http";
import { getMqttRuntime, testBrokerConnection } from "@backend/mqtt/runtime";
import { requireMachine, seesMachine, seesPlant, type Scope } from "@backend/services/access-service";
import { requireBroker, requireEdgeEntity, requireEdgeFields, requireGateway } from "@backend/services/edge-access";
import { getMachineAcquisition } from "@backend/services/edge-live";
import { brokerConfigForTest, commissionGateway, createEdgeEntity, deleteEdgeEntity, deleteEdgeTag, getEdgeRegistry, isEdgeKind, mapEdgeChannel, updateEdgeEntity } from "@backend/services/edge-service";
import { type ApiSuccess } from "@shared/types/api";
import { type BrokerTestResult, type EdgeCommissionResult, type EdgeMapResult, type EdgeRegistry, type MachineAcquisition } from "@shared/types/edge";

/** /api/edge */
export const edge = new Hono();

/**
 * The registry of the scope's plants: gateways sited in them or wired to their
 * machines, those gateways' sources, cards and points, and the brokers they use.
 */
function scopeRegistry(scope: Scope, reg: EdgeRegistry): EdgeRegistry {
  if (scope.all) return reg;
  const siteById = new Map(reg.sites.map((s) => [s.id, s]));
  const plantOf = (siteId: string | null): string | null => {
    for (let s = siteId ? siteById.get(siteId) : undefined, hops = 0; s && hops < 16; s = s.parentId ? siteById.get(s.parentId) : undefined, hops++) {
      if (s.type === "plant") return s.id;
    }
    return null;
  };
  const wired = new Set<string>();
  const sourceGateway = new Map(reg.sources.map((s) => [s.id, s.gatewayId]));
  for (const s of reg.sources) if (seesMachine(scope, s.machineId)) wired.add(s.gatewayId);
  for (const pt of reg.points) if (seesMachine(scope, pt.machineId)) wired.add(sourceGateway.get(pt.sourceId) ?? "");
  const gateways = reg.gateways.filter((g) => seesPlant(scope, plantOf(g.siteNodeId)) || wired.has(g.id));
  const gatewayIds = new Set(gateways.map((g) => g.id));
  const sources = reg.sources.filter((s) => gatewayIds.has(s.gatewayId) && (!scope.onlyMachines || !s.machineId || seesMachine(scope, s.machineId)));
  const sourceIds = new Set(sources.map((s) => s.id));
  const brokerIds = new Set(gateways.map((g) => g.brokerId));
  return {
    formats: reg.formats,
    brokers: reg.brokers.filter((b) => brokerIds.has(b.id)),
    gateways,
    sources,
    cards: reg.cards.filter((c) => sourceIds.has(c.sourceId)),
    points: reg.points.filter((pt) => sourceIds.has(pt.sourceId) && (!pt.machineId || seesMachine(scope, pt.machineId))),
    sites: reg.sites.filter((s) => seesPlant(scope, plantOf(s.id))),
    machines: reg.machines.filter((m) => seesMachine(scope, m.id)),
  };
}
edge.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const scope = await requestScope(request);
    const body: ApiSuccess<EdgeRegistry> = { data: scopeRegistry(scope, await getEdgeRegistry()) };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_FETCH_ERROR");
  }
});

edge.post("/commission", async (c) => {
  const request = c.req.raw;
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  try {
    const scope = await requestScope(request);
    if (typeof body.gatewayId === "string" && body.gatewayId) await requireGateway(scope, body.gatewayId);
    else if (typeof body.gateway === "object" && body.gateway !== null) await requireEdgeFields(scope, "gateways", body.gateway as Record<string, unknown>);
    for (const s of Array.isArray(body.sources) ? body.sources : []) {
      const machineId = (s as { machineId?: unknown } | null)?.machineId;
      requireMachine(scope, typeof machineId === "string" ? machineId : null);
    }
    const res: ApiSuccess<EdgeCommissionResult> = { data: await commissionGateway(body) };
    // A new gateway may carry a custom format: its topic joins the subscriptions.
    await getMqttRuntime().reload();
    return Response.json(res, { status: 201 });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_COMMISSION_ERROR");
  }
});

edge.post("/map", async (c) => {
  const request = c.req.raw;
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  try {
    const scope = await requestScope(request);
    await requireGateway(scope, typeof body.gatewayId === "string" ? body.gatewayId : null);
    requireMachine(scope, typeof body.machineId === "string" ? body.machineId : null);
    const res: ApiSuccess<EdgeMapResult> = { data: await mapEdgeChannel(body) };
    return Response.json(res, { status: 201 });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_MAP_ERROR");
  }
});

edge.delete("/tags", async (c) => {
  const request = c.req.raw;
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_BODY", "Send a JSON object with gatewayId, rack and card.");
  try {
    await requireGateway(await requestScope(request), typeof body.gatewayId === "string" ? body.gatewayId.trim() : null);
    const res = await deleteEdgeTag(body);
    if (res.brokerId) getMqttRuntime().forgetCard(res.brokerId, String(body.gatewayId), res.gatewayCode, String(body.rack).trim(), String(body.card).trim());
    return Response.json({ data: { cards: res.cards, points: res.points } });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_TAG_DELETE_ERROR");
  }
});

edge.post("/test-broker", async (c) => {
  const request = c.req.raw;
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  const id = typeof body.id === "string" && body.id ? body.id : null;
  const { id: _omit, ...fields } = body;
  void _omit;
  try {
    await requireBroker(await requestScope(request), id);
    const config = await brokerConfigForTest(fields, id);
    const res: ApiSuccess<BrokerTestResult> = { data: await testBrokerConnection(config) };
    return Response.json(res);
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "BROKER_TEST_ERROR");
  }
});

edge.get("/machines/:id", async (c) => {
  const request = c.req.raw;
  const { id } = c.req.param();
  try {
    requireMachine(await requestScope(request), id);
    const body: ApiSuccess<MachineAcquisition> = { data: await getMachineAcquisition(id) };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "MACHINE_ACQUISITION_ERROR");
  }
});

edge.post("/:kind", async (c) => {
  const request = c.req.raw;
  const { kind } = c.req.param();
  if (!isEdgeKind(kind)) return fail(404, "INVALID_KIND", `Unknown registry kind “${kind}”.`);
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  try {
    await requireEdgeFields(await requestScope(request), kind, body);
    const data = await createEdgeEntity(kind, body);
    // Brokers, gateways and formats decide what each connection subscribes to.
    if (kind !== "points" && kind !== "sources" && kind !== "cards") await getMqttRuntime().reload();
    return Response.json({ data }, { status: 201 });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_CREATE_ERROR");
  }
});

edge.patch("/:kind/:id", async (c) => {
  const request = c.req.raw;
  const { kind, id } = c.req.param();
  if (!isEdgeKind(kind)) return fail(404, "INVALID_KIND", `Unknown registry kind “${kind}”.`);
  const body = await readBody(request);
  if (!body) return fail(400, "INVALID_JSON", "Request body must be a JSON object.");
  try {
    const scope = await requestScope(request);
    await requireEdgeEntity(scope, kind, id);
    await requireEdgeFields(scope, kind, body);
    const data = await updateEdgeEntity(kind, id, body);
    // Brokers, gateways and formats decide what each connection subscribes to.
    if (kind !== "points" && kind !== "sources" && kind !== "cards") await getMqttRuntime().reload();
    return Response.json({ data });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_UPDATE_ERROR");
  }
});

edge.delete("/:kind/:id", async (c) => {
  const request = c.req.raw;
  const { kind, id } = c.req.param();
  if (!isEdgeKind(kind)) return fail(404, "INVALID_KIND", `Unknown registry kind “${kind}”.`);
  try {
    await requireEdgeEntity(await requestScope(request), kind, id);
    await deleteEdgeEntity(kind, id);
    // Brokers, gateways and formats decide what each connection subscribes to.
    if (kind !== "points" && kind !== "sources" && kind !== "cards") await getMqttRuntime().reload();
    return Response.json({ data: { id } });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_DELETE_ERROR");
  }
});
