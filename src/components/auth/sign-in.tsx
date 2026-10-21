"use client";

import React, { useEffect, useRef, useState } from "react";
import { Field, FieldGrid, Select, TextArea, TextInput } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import "./sign-in.css";

const LAYERS = [
  { name: "Diagnosis", what: "What is happening now" },
  { name: "Prognosis", what: "What happens next" },
  { name: "Analysis", what: "Why it is happening" },
];

const INDUSTRIES = [
  "Cement & minerals",
  "Steel & metals",
  "Food & beverage",
  "Chemicals & pharma",
  "Power & utilities",
  "Textiles & paper",
  "Automotive",
  "Warehousing",
  "Other",
];

/**
 * Signed-out landing, always dark: section 1 is the sign-in over the plant
 * video, section 2 the "Request a demo" form for visitors without an account.
 * Every account has its own login and sees only its own plants.
 */
export function SignInScreen() {
  return (
    <div className="auth-page">
      <main>
        <SignInSection />
        <DemoSection />
      </main>
      <footer className="auth-footer">
        <OswarLogo />
        <span>© 2026 OSWAR/teck Systems</span>
        <a href="mailto:info@oswarteck.com">info@oswarteck.com</a>
      </footer>
    </div>
  );
}

/** A muted, looping background clip; held on its poster frame when the visitor prefers reduced motion. */
function LoopVideo({ src, poster, className }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => (mq.matches ? v.pause() : void v.play().catch(() => undefined));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return <video ref={ref} className={className} src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden="true" />;
}

/** The page is always dark, so both marks use their light ink. */
function OswarLogo() {
  return (
    <span className="auth-oswar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/login/oswarteck-light.png" alt="OSWAR/teck" />
    </span>
  );
}

function UltronWordmark() {
  return (
    <div className="auth-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wordmark-dark.png" alt="ULTRON" />
    </div>
  );
}

/** Square call to action: label left, arrow right; the label changes while it works. */
function Cta({ busy, busyLabel, children, onClick, type = "submit", quiet }: { busy?: boolean; busyLabel?: string; children: React.ReactNode; onClick?: () => void; type?: "submit" | "button"; quiet?: boolean }) {
  return (
    <button type={type} className="auth-cta" data-quiet={quiet || undefined} data-busy={busy || undefined} aria-busy={busy || undefined} disabled={busy} onClick={onClick}>
      <span>{busy && busyLabel ? busyLabel : children}</span>
      <span className="auth-cta-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function SignInSection() {
  const { signIn } = useIndustrialData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await signIn(email.trim(), password);
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  return (
    <section className="auth-hero" aria-labelledby="auth-title">
      <div className="auth-media">
        <LoopVideo className="auth-video" src="/login/steel-hall.mp4" poster="/login/steel-hall-poster.jpg" />
        <div className="auth-scrim" />
        <header className="auth-topbar">
          <OswarLogo />
          <a className="auth-toplink" href="#request-demo">
            Request a demo <span aria-hidden="true">→</span>
          </a>
        </header>
        <div className="auth-pitch">
          <p className="auth-eyebrow">ULTRON / Predictive maintenance</p>
          <p className="auth-headline">
            <span>Predict failure.</span>
            <span>Before it happens.</span>
          </p>
          <ol className="auth-layers">
            {LAYERS.map((l, i) => (
              <li key={l.name}>
                <span className="auth-layer-num">0{i + 1}</span>
                <span className="auth-layer-name">{l.name}</span>
                <span className="auth-layer-what">{l.what}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-panel-top">
          <UltronWordmark />
          <span className="auth-panel-tag">Plant access</span>
        </div>
        <div className="auth-panel-body">
          <div>
            <h1 id="auth-title" className="auth-title">
              Sign in
            </h1>
            <p className="auth-sub">Use your plant account. Each account opens its own plant.</p>
          </div>
          <form className="auth-form" onSubmit={submit} noValidate>
            <Field label="Email">
              {(id, d) => (
                <TextInput
                  id={id}
                  describedBy={d}
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(v) => {
                    setEmail(v);
                    setError(null);
                  }}
                  autoComplete="username"
                  required
                  autoFocus
                />
              )}
            </Field>
            <Field label="Password">
              {(id, d) => (
                <TextInput
                  id={id}
                  describedBy={d}
                  type="password"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    setError(null);
                  }}
                  autoComplete="current-password"
                  required
                />
              )}
            </Field>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <Cta busy={busy} busyLabel="Signing in…">
              Sign in
            </Cta>
          </form>
        </div>
        <p className="auth-foot">
          No account yet? <a href="#request-demo">Request a demo →</a>
        </p>
      </div>
    </section>
  );
}

type DemoForm = { name: string; email: string; company: string; industry: string; message: string };
const EMPTY: DemoForm = { name: "", email: "", company: "", industry: "", message: "" };

function DemoSection() {
  const [form, setForm] = useState<DemoForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof DemoForm, string>>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = (k: keyof DemoForm) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setFailed(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const email = form.email.trim();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a work email like name@company.com.";
    if (!form.company.trim()) next.company = "Enter your company.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/demo-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, email }) });
      const body = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!r.ok) throw new Error(body?.error?.message || "The request could not be sent.");
      setSentTo(email);
      setForm(EMPTY);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "The request could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="request-demo" className="auth-demo" aria-labelledby="demo-title">
      <div className="auth-demo-head">
        <p className="auth-eyebrow">02 / Request a demo</p>
        <h2 id="demo-title" className="auth-demo-title">
          See ULTRON on a machine like yours.
        </h2>
      </div>
      <div className="auth-demo-media">
        <figure className="auth-tile">
          <LoopVideo className="auth-tile-media" src="/login/machine-detail.mp4" poster="/login/machine-detail-poster.jpg" />
          <figcaption>
            <span className="auth-layer-num">01</span>Start with one machine.
          </figcaption>
        </figure>
        <figure className="auth-tile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="auth-tile-media" src="/login/cement-plant.jpg" alt="" loading="lazy" />
          <figcaption>
            <span className="auth-layer-num">02</span>Scale across the plant.
          </figcaption>
        </figure>
      </div>

      <div className="auth-demo-form">
        <p className="auth-sub">Tell us what you run. We reply within one business day.</p>
        {sentTo ? (
          <div className="auth-sent" role="status">
            <p className="auth-sent-title">Request sent</p>
            <p className="auth-sub">
              We will write to <strong>{sentTo}</strong> within one business day.
            </p>
            <Cta type="button" quiet onClick={() => setSentTo(null)}>
              Send another request
            </Cta>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit} noValidate>
            <FieldGrid>
              <Field label="Name" required error={errors.name}>
                {(id, d) => <TextInput id={id} describedBy={d} value={form.name} onChange={set("name")} autoComplete="name" />}
              </Field>
              <Field label="Work email" required error={errors.email}>
                {(id, d) => (
                  <TextInput id={id} describedBy={d} type="email" inputMode="email" autoCapitalize="none" value={form.email} onChange={set("email")} autoComplete="email" />
                )}
              </Field>
              <Field label="Company" required error={errors.company}>
                {(id, d) => <TextInput id={id} describedBy={d} value={form.company} onChange={set("company")} autoComplete="organization" />}
              </Field>
              <Field label="Industry">
                {(id, d) => (
                  <Select
                    id={id}
                    describedBy={d}
                    value={form.industry}
                    onChange={set("industry")}
                    options={[{ value: "", label: "Choose…" }, ...INDUSTRIES.map((v) => ({ value: v, label: v }))]}
                  />
                )}
              </Field>
              <Field label="Machines to watch" hint="Optional. For example: 2 rotary kilns, 6 ID fans." wide>
                {(id, d) => <TextArea id={id} describedBy={d} value={form.message} onChange={set("message")} rows={4} maxLength={4000} />}
              </Field>
            </FieldGrid>
            {failed && (
              <p className="auth-error" role="alert">
                {failed}
              </p>
            )}
            <Cta busy={busy} busyLabel="Sending…">
              Request demo
            </Cta>
          </form>
        )}
      </div>
    </section>
  );
}

/** While the saved session is checked: the wordmark and one quiet line, never a blank page. */
export function AuthChecking() {
  return (
    <main className="auth-page auth-screen" aria-busy="true">
      <div className="auth-checking" role="status">
        <UltronWordmark />
        <p className="auth-sub">Checking your sign-in…</p>
      </div>
    </main>
  );
}
