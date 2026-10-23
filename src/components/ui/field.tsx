"use client";

import React, { useId } from "react";
import "./form.css";

/* ==========================================================================
   Form fields: one label, one control, an optional hint or error. Controls
   are plain inputs styled by form.css so they inherit the UI font and the tokens.
   ========================================================================== */

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  /** Span both columns of a `FieldGrid`. */
  wide?: boolean;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}

export function Field({ label, hint, error, required, wide, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error || hint;
  return (
    <div className="ui-field" data-wide={wide || undefined} data-invalid={error ? true : undefined}>
      <label className="ui-field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="ui-field-req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {withState(children(id, note ? noteId : undefined), !!error, !!required)}
      {note && (
        <span id={noteId} className="ui-field-note" role={error ? "alert" : undefined}>
          {note}
        </span>
      )}
    </div>
  );
}

/** Tell assistive tech what the label already shows: required, and invalid while an error is up. */
function withState(control: React.ReactNode, invalid: boolean, required: boolean): React.ReactNode {
  if (!React.isValidElement(control) || (!invalid && !required)) return control;
  // A fragment (input + its datalist) takes no props: mark its first element.
  if (control.type === React.Fragment) {
    const [first, ...rest] = React.Children.toArray((control.props as { children?: React.ReactNode }).children);
    return (
      <>
        {withState(first, invalid, required)}
        {rest}
      </>
    );
  }
  return React.cloneElement(control as React.ReactElement<Record<string, unknown>>, {
    "aria-invalid": invalid || undefined,
    "aria-required": required || undefined,
  });
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="ui-field-grid">{children}</div>;
}

/** Group heading inside a long form. */
export function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="ui-fieldset">
      <legend className="ui-fieldset-title">{title}</legend>
      {children}
    </fieldset>
  );
}

type Base = {
  id: string;
  describedBy?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Accessible name when no visible <label> points at the control (table cells, inline editors). */
  ariaLabel?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

export function TextInput({
  id,
  describedBy,
  value,
  onChange,
  type = "text",
  mono,
  ariaLabel,
  ...rest
}: Base & {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "password" | "url" | "email";
  mono?: boolean;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: string;
  onBlur?: () => void;
}) {
  return (
    <input
      id={id}
      className="ui-input"
      data-mono={mono || undefined}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      type={type}
      value={value}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

/** Numbers are edited as text so a half-typed "-" or "1." is not lost. A decimal comma
 *  ("1,5") and stray spaces are accepted and handed on as "1.5". */
export function NumberInput({
  id,
  describedBy,
  value,
  onChange,
  ariaLabel,
  ...rest
}: Base & { value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number | "any"; required?: boolean; autoFocus?: boolean }) {
  return (
    <input
      id={id}
      className="ui-input"
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(normalizeNumberText(e.target.value))}
      {...rest}
    />
  );
}

/** "1,5" → "1.5", " 12 " → "12". Leaves anything else for the caller's own check. */
export function normalizeNumberText(v: string): string {
  return v.replace(/\s+/g, "").replace(/^(-?\d*),(\d*)$/, "$1.$2");
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function Select({
  id,
  describedBy,
  value,
  onChange,
  options,
  disabled,
  ariaLabel,
  ...aria
}: Base & { value: string; onChange: (v: string) => void; options: SelectOption[] }) {
  return (
    <span className="ui-select">
      <select
        id={id}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={aria["aria-invalid"]}
        aria-required={aria["aria-required"]}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  );
}

export function TextArea({
  id,
  describedBy,
  value,
  onChange,
  rows = 3,
  mono,
  ariaLabel,
  ...rest
}: Base & { value: string; onChange: (v: string) => void; rows?: number; mono?: boolean; autoFocus?: boolean; maxLength?: number }) {
  return (
    <textarea
      id={id}
      className="ui-input ui-textarea"
      data-mono={mono || undefined}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      rows={rows}
      value={value}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

/** On/off switch with its own inline label. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className="ui-toggle" htmlFor={id} data-disabled={disabled || undefined}>
      <span className="ui-toggle-text">
        <span className="ui-toggle-label">{label}</span>
        {description && <span className="ui-toggle-desc">{description}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="ui-toggle-track" aria-hidden="true">
        <span className="ui-toggle-thumb" />
      </span>
    </label>
  );
}

/** Inline status line for a form (saved, failed, test result). */
export function FormNote({ tone, children }: { tone: "good" | "warn" | "bad" | "info"; children: React.ReactNode }) {
  return (
    <p className="ui-form-note" data-tone={tone} role="status">
      {children}
    </p>
  );
}
