"use client";

import React, { useState } from "react";
import { Field, PillButton, TextInput } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import "./sign-in.css";

/** Sign-in screen: every account (kiln-seal plant, pyro line) has its own login and sees only its own plant. */
export function SignInScreen() {
  const { signIn } = useIndustrialData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await signIn(email, password);
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-dark.png" alt="ULTRON" className="brand-logo-dark" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-light.png" alt="ULTRON" className="brand-logo-light" />
        </div>
        <div>
          <h1 id="auth-title" className="auth-title">
            Sign in
          </h1>
          <p className="auth-sub">Use your plant account. Each account opens its own plant.</p>
        </div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <Field label="Email">
            {(id, d) => <TextInput id={id} describedBy={d} type="text" value={email} onChange={setEmail} autoComplete="username" required autoFocus />}
          </Field>
          <Field label="Password">
            {(id, d) => <TextInput id={id} describedBy={d} type="password" value={password} onChange={setPassword} autoComplete="current-password" required />}
          </Field>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <PillButton type="submit" variant="primary" disabled={busy || !email || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </PillButton>
        </form>
        <p className="auth-foot">ULTRON · predictive maintenance for machines and plants</p>
      </section>
    </main>
  );
}
