"use client";

import React, { useEffect, useState } from "react";
import { Dialog, Field, FieldGrid, FieldSection, FormNote, MoreFields, NumberInput, PillButton, Select, TextInput } from "@/components/ui";
import { machineName } from "@/components/maintenance/pms-model";
import { sapCall, type PublicSapConnection, type SapAuthType, type SapDashboard, type SapEquipmentMapping, type SapMaterialMapping } from "./sap-api";

/* ==========================================================================
   SAP dialogs: the plant's connection (ported from the ULTRON console's
   SapConnectionDialog), one machine's SAP equipment, one material mapping.
   Secrets are never sent back to the browser: a blank secret keeps the
   stored one.
   ========================================================================== */

type Outcome = { tone: "good" | "bad"; text: string } | null;

export function SapConnectionDialog({
  open,
  onClose,
  plantId,
  plantName,
  dash,
}: {
  open: boolean;
  onClose: () => void;
  plantId: string;
  plantName: string;
  dash: SapDashboard;
}) {
  const c: PublicSapConnection | null = dash.connection;
  const blank = () => ({
    name: c?.name ?? "SAP S/4HANA",
    editionId: c?.editionId ?? dash.vocabulary.editions[0]?.id ?? "",
    baseUrl: c?.baseUrl ?? "",
    authType: (c?.authType ?? dash.vocabulary.authTypes[0]?.id ?? "oauth_client_credentials") as SapAuthType,
    tokenUrl: c?.tokenUrl ?? "",
    user: c?.credentialUser ?? "",
    secret: "",
    scope: "",
    sapPlant: c?.sapPlant ?? "",
    notificationType: c?.notificationType ?? "M1",
    syncEvery: c?.syncEveryMin ? String(c.syncEveryMin) : "",
    publishEvery: c?.publishEveryMin ? String(c.publishEveryMin) : "",
    paths: { ...(c?.paths ?? {}) } as Record<string, string>,
  });
  const [form, setForm] = useState(blank);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [showPaths, setShowPaths] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(blank());
    setDirty(false);
    setOutcome(null);
    // Fill from the stored connection each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof ReturnType<typeof blank>>(k: K, v: ReturnType<typeof blank>[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const oauth = form.authType === "oauth_client_credentials";
  const hasSecret = c?.credentialStatus === "configured" && c.authType === form.authType;

  const save = async (): Promise<boolean> => {
    setBusy("save");
    setOutcome(null);
    const out = await sapCall<PublicSapConnection>(
      "/connection",
      "PUT",
      {
        plantId,
        name: form.name,
        editionId: form.editionId,
        baseUrl: form.baseUrl,
        authType: form.authType,
        tokenUrl: oauth ? form.tokenUrl : undefined,
        ...(oauth ? { clientId: form.user, clientSecret: form.secret, scope: form.scope } : { username: form.user, password: form.secret }),
        sapPlant: form.sapPlant,
        notificationType: form.notificationType,
        syncEveryMin: form.syncEvery.trim() ? Number(form.syncEvery) : null,
        publishEveryMin: form.publishEvery.trim() ? Number(form.publishEvery) : null,
        paths: form.paths,
      },
      "Could not save the connection",
    );
    setBusy(null);
    if ("error" in out) {
      setOutcome({ tone: "bad", text: out.error });
      return false;
    }
    setDirty(false);
    setForm((f) => ({ ...f, secret: "" }));
    return true;
  };

  const saveAndTest = async () => {
    if (dirty || !c) {
      if (!(await save())) return;
    }
    setBusy("test");
    const out = await sapCall<{ ok: boolean; message: string }>("/connection/test", "POST", { plantId }, "Could not try the connection");
    setBusy(null);
    if ("error" in out) setOutcome({ tone: "bad", text: out.error });
    else setOutcome({ tone: out.data.ok ? "good" : "bad", text: out.data.ok ? `${out.data.message}. SAP and its Equipment API answer.` : out.data.message });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="SAP connection"
      subtitle={`${plantName}: the SAP system ULTRON reads from and raises notifications in`}
      busy={busy !== null}
      dirty={dirty}
      width={640}
      onSubmit={() =>
        void save().then((ok) => {
          if (ok) onClose();
        })
      }
      footerStart={outcome ? <FormNote tone={outcome.tone}>{outcome.text}</FormNote> : undefined}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy !== null}>
            Close
          </PillButton>
          <PillButton variant="secondary" type="button" loading={busy === "test"} disabled={busy === "save"} onClick={() => void saveAndTest()}>
            {dirty || !c ? "Save and try it" : "Try the connection"}
          </PillButton>
          <PillButton type="submit" loading={busy === "save"} disabled={busy === "test"}>
            Save
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Name" required>
          {(id, d) => <TextInput id={id} describedBy={d} value={form.name} onChange={(v) => set("name", v)} required />}
        </Field>
        <Field label="SAP edition" required>
          {(id, d) => <Select id={id} describedBy={d} value={form.editionId} onChange={(v) => set("editionId", v)} options={dash.vocabulary.editions.map((e) => ({ value: e.id, label: e.label }))} />}
        </Field>
        <Field label="SAP address" required wide hint="The API host of the SAP system, for example https://my-api.s4hana.cloud.sap">
          {(id, d) => <TextInput id={id} describedBy={d} type="url" mono value={form.baseUrl} onChange={(v) => set("baseUrl", v)} required />}
        </Field>
      </FieldGrid>

      <FieldSection title="Sign-in">
        <FieldGrid>
          <Field label="How ULTRON signs in" required wide>
            {(id, d) => (
              <Select
                id={id}
                describedBy={d}
                value={form.authType}
                onChange={(v) => {
                  set("authType", v as SapAuthType);
                  set("secret", "");
                }}
                options={dash.vocabulary.authTypes.map((a) => ({ value: a.id, label: a.label }))}
              />
            )}
          </Field>
          {oauth && (
            <Field label="Token address" required wide>
              {(id, d) => <TextInput id={id} describedBy={d} type="url" mono value={form.tokenUrl} onChange={(v) => set("tokenUrl", v)} required />}
            </Field>
          )}
          <Field label={oauth ? "Client ID" : "User name"} required>
            {(id, d) => <TextInput id={id} describedBy={d} mono value={form.user} onChange={(v) => set("user", v)} autoComplete="off" required />}
          </Field>
          <Field label={oauth ? "Client secret" : "Password"} required={!hasSecret} hint={hasSecret ? "Stored. Leave blank to keep it." : undefined}>
            {(id, d) => <TextInput id={id} describedBy={d} type="password" value={form.secret} onChange={(v) => set("secret", v)} autoComplete="new-password" required={!hasSecret} />}
          </Field>
          {oauth && (
            <Field label="Scope" hint="Only when your SAP system asks for one.">
              {(id, d) => <TextInput id={id} describedBy={d} mono value={form.scope} onChange={(v) => set("scope", v)} />}
            </Field>
          )}
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Plant in SAP">
        <FieldGrid>
          <Field label="SAP plant code" hint="The plant's code in SAP (WERKS), for example 1000.">
            {(id, d) => <TextInput id={id} describedBy={d} mono value={form.sapPlant} onChange={(v) => set("sapPlant", v)} />}
          </Field>
          <Field label="Notification type" hint="The type ULTRON raises. M1 is a maintenance request in standard SAP.">
            {(id, d) => <TextInput id={id} describedBy={d} mono value={form.notificationType} onChange={(v) => set("notificationType", v.toUpperCase())} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Automatic">
        <FieldGrid>
          <Field label="Sync every (minutes)" hint="Blank: only with Sync now.">
            {(id, d) => <NumberInput id={id} describedBy={d} value={form.syncEvery} onChange={(v) => set("syncEvery", v)} />}
          </Field>
          <Field label="Write readings every (minutes)" hint="Linked readings go to SAP measuring points. Blank: only by hand.">
            {(id, d) => <NumberInput id={id} describedBy={d} value={form.publishEvery} onChange={(v) => set("publishEvery", v)} />}
          </Field>
        </FieldGrid>
      </FieldSection>

      <MoreFields label="API paths" open={showPaths} onToggle={setShowPaths}>
        <FieldGrid>
          {dash.vocabulary.resources.map((r) => (
            <Field key={r.id} label={`${r.label} (${r.apiName})`} wide hint={form.paths[r.id] ? undefined : "Standard SAP path"}>
              {(id, d) => (
                <TextInput
                  id={id}
                  describedBy={d}
                  mono
                  value={form.paths[r.id] ?? r.defaultPath}
                  onChange={(v) => set("paths", { ...form.paths, [r.id]: v === r.defaultPath ? "" : v })}
                />
              )}
            </Field>
          ))}
        </FieldGrid>
      </MoreFields>
    </Dialog>
  );
}

/** One machine's SAP equipment number, functional location, work and cost centre. */
export function EquipmentMappingDialog({ open, onClose, plantId, row }: { open: boolean; onClose: () => void; plantId: string; row: SapEquipmentMapping | null }) {
  const [form, setForm] = useState({ eq: "", floc: "", wc: "", cc: "" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !row) return;
    setForm({ eq: row.sapEquipmentId ?? "", floc: row.functionalLocation ?? "", wc: row.workCenter ?? "", cc: row.costCenter ?? "" });
    setDirty(false);
    setError(null);
  }, [open, row]);
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const submit = async () => {
    if (!row) return;
    setBusy(true);
    setError(null);
    const out = await sapCall(
      "/mappings/equipment",
      "PUT",
      { plantId, machineId: row.machineId, sapEquipmentId: form.eq, functionalLocation: form.floc, workCenter: form.wc, costCenter: form.cc },
      "Could not save the mapping",
    );
    setBusy(false);
    if ("error" in out) setError(out.error);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="SAP equipment"
      subtitle={row ? `${row.machineName} (${row.machineId})` : undefined}
      busy={busy}
      dirty={dirty}
      onSubmit={() => void submit()}
      footerStart={error ? <FormNote tone="bad">{error}</FormNote> : undefined}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            Save
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="SAP equipment number" required hint="Notifications ULTRON raises for this machine go to this equipment.">
          {(id, d) => <TextInput id={id} describedBy={d} mono value={form.eq} onChange={(v) => set("eq", v)} required autoFocus />}
        </Field>
        <Field label="Functional location">
          {(id, d) => <TextInput id={id} describedBy={d} mono value={form.floc} onChange={(v) => set("floc", v)} />}
        </Field>
        <Field label="Work centre">
          {(id, d) => <TextInput id={id} describedBy={d} mono value={form.wc} onChange={(v) => set("wc", v)} />}
        </Field>
        <Field label="Cost centre">
          {(id, d) => <TextInput id={id} describedBy={d} mono value={form.cc} onChange={(v) => set("cc", v)} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}

/** Which SAP material a machine (part) uses, and how many a job needs. */
export function MaterialMappingDialog({
  open,
  onClose,
  plantId,
  dash,
  row,
  machineIds,
  defaultMachine,
}: {
  open: boolean;
  onClose: () => void;
  plantId: string;
  dash: SapDashboard;
  row: SapMaterialMapping | null;
  machineIds: string[];
  defaultMachine: string | null;
}) {
  const empty = { machineId: defaultMachine ?? machineIds[0] ?? "", partId: "", description: "", material: "", storage: "", qty: "", unit: "" };
  const [form, setForm] = useState(empty);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setForm(
      row
        ? { machineId: row.machineId, partId: row.partId ?? "", description: row.description, material: row.sapMaterial, storage: row.storageLocation ?? "", qty: row.requiredQuantity === null ? "" : String(row.requiredQuantity), unit: row.unit ?? "" }
        : empty,
    );
    setDirty(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row]);
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v, ...(k === "machineId" ? { partId: "" } : {}) }));
    setDirty(true);
  };
  const parts = dash.parts.filter((p) => p.machineId === form.machineId);
  const submit = async () => {
    setBusy(true);
    setError(null);
    const out = await sapCall(
      "/mappings/materials",
      "PUT",
      { plantId, machineId: form.machineId, partId: form.partId || null, description: form.description, sapMaterial: form.material, storageLocation: form.storage, requiredQuantity: form.qty.trim() ? Number(form.qty) : null, unit: form.unit },
      "Could not save the material",
    );
    setBusy(false);
    if ("error" in out) setError(out.error);
    else onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={row ? "Spare part material" : "Add a spare part"}
      subtitle="The SAP material a machine part uses, so its stock shows here"
      busy={busy}
      dirty={dirty}
      onSubmit={() => void submit()}
      footerStart={error ? <FormNote tone="bad">{error}</FormNote> : undefined}
      footer={
        <>
          <PillButton variant="secondary" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton type="submit" loading={busy}>
            Save
          </PillButton>
        </>
      }
    >
      <FieldGrid>
        <Field label="Machine" required>
          {(id, d) => <Select id={id} describedBy={d} value={form.machineId} onChange={(v) => set("machineId", v)} options={machineIds.map((m) => ({ value: m, label: machineName(m) }))} disabled={Boolean(row)} />}
        </Field>
        <Field label="Part">
          {(id, d) => <Select id={id} describedBy={d} value={form.partId} onChange={(v) => set("partId", v)} options={[{ value: "", label: "Whole machine" }, ...parts.map((p) => ({ value: p.id, label: p.name }))]} />}
        </Field>
        <Field label="What it is" required wide hint="For example: Drive-end bearing 6309-C3">
          {(id, d) => <TextInput id={id} describedBy={d} value={form.description} onChange={(v) => set("description", v)} required />}
        </Field>
        <Field label="SAP material number" required>
          {(id, d) => <TextInput id={id} describedBy={d} mono value={form.material} onChange={(v) => set("material", v.toUpperCase())} required disabled={Boolean(row)} />}
        </Field>
        <Field label="Storage location">
          {(id, d) => <TextInput id={id} describedBy={d} mono value={form.storage} onChange={(v) => set("storage", v.toUpperCase())} />}
        </Field>
        <Field label="Needed for one job">
          {(id, d) => <NumberInput id={id} describedBy={d} value={form.qty} onChange={(v) => set("qty", v)} />}
        </Field>
        <Field label="Unit" hint="As in SAP, for example EA or L.">
          {(id, d) => <TextInput id={id} describedBy={d} mono value={form.unit} onChange={(v) => set("unit", v.toUpperCase())} />}
        </Field>
      </FieldGrid>
    </Dialog>
  );
}
