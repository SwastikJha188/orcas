import { Hono } from "hono";
import { accessFail, requestScope } from "@backend/http";
import { narrowMachine, requireMachine, requireMachineRow, singlePlant } from "@backend/services/access-service";
import { OpsInputError, createWorkOrder, deleteWorkOrder, listWorkOrders, updateWorkOrder } from "@backend/services/ops-service";

/** /api/work-orders */
export const workOrders = new Hono();

function fail(error: unknown, code: string, fallback: string) {
  const bad = error instanceof OpsInputError;
  const message = error instanceof Error ? error.message : fallback;
  return Response.json({ error: { code: bad ? "INVALID_INPUT" : code, message } }, { status: bad ? 400 : 500 });
}
workOrders.get("/", async (c) => {
  const request = c.req.raw;
  try {
    const params = new URL(request.url).searchParams;
    const scope = await requestScope(request);
    const machineId = narrowMachine(scope, params.get("machineId"));
    const plantId = singlePlant(scope, params.get("plantId"), machineId);
    return Response.json({ data: await listWorkOrders(machineId, plantId) });
  } catch (error) {
    return accessFail(error) ?? fail(error, "WORK_ORDERS_ERROR", "Failed to load work orders");
  }
});

workOrders.post("/", async (c) => {
  const request = c.req.raw;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    requireMachine(await requestScope(request), typeof body.machineId === "string" ? body.machineId : null);
    return Response.json({ data: await createWorkOrder(body) }, { status: 201 });
  } catch (error) {
    return accessFail(error) ?? fail(error, "WORK_ORDER_CREATE_ERROR", "Failed to create work order");
  }
});

workOrders.delete("/", async (c) => {
  const request = c.req.raw;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    await requireMachineRow(await requestScope(request), "work_orders", id, "Work order");
    const deleted = await deleteWorkOrder(id);
    if (!deleted) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Work order not found" } }, { status: 404 });
    }
    return Response.json({ data: { id, deleted: true } });
  } catch (error) {
    return accessFail(error) ?? fail(error, "WORK_ORDER_DELETE_ERROR", "Failed to delete work order");
  }
});

workOrders.patch("/:id", async (c) => {
  const request = c.req.raw;
  try {
    const { id } = c.req.param();
    await requireMachineRow(await requestScope(request), "work_orders", Number(id), "Work order");
    const body = (await request.json()) as Record<string, unknown>;
    const data = await updateWorkOrder(Number(id), body);
    if (!data) return Response.json({ error: { code: "NOT_FOUND", message: "Work order not found" } }, { status: 404 });
    return Response.json({ data });
  } catch (error) {
    const denied = accessFail(error);
    if (denied) return denied;
    const bad = error instanceof OpsInputError;
    const message = error instanceof Error ? error.message : "Failed to update work order";
    return Response.json({ error: { code: bad ? "INVALID_INPUT" : "WORK_ORDER_UPDATE_ERROR", message } }, { status: bad ? 400 : 500 });
  }
});
