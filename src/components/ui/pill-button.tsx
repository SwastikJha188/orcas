"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * An action's click handler. Returning a promise shows the spinner while it runs; resolving to
 * `true` then flashes a tick, `false` the error style. Resolving to nothing flashes nothing, so a
 * tick only ever means the action said it worked.
 */
export type PillClick = (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<boolean | void>;

export interface PillButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onClick?: PillClick;
  /** "danger" is for destructive confirmations: danger ink on a faint danger fill. */
  variant?: "primary" | "secondary" | "danger";
  icon?: React.ReactNode;
  hasDropdown?: boolean;
  /** Toggle state for segmented/toggle use; sets aria-pressed. */
  pressed?: boolean;
  /** Trailing node after the label (e.g. a chevron). */
  trailing?: React.ReactNode;
  /** Pending/loading state (State 6 of 8-state interactive system). */
  loading?: boolean;
  /** Feedback state (States 7 & 8: error or success). */
  state?: "default" | "error" | "success";
}

export function PillButton({
  variant = "primary",
  icon,
  hasDropdown,
  children,
  className = "",
  pressed,
  trailing,
  loading = false,
  state = "default",
  disabled,
  onClick,
  ...props
}: PillButtonProps) {
  const variantClass = variant === "primary" ? "btn-pill-primary" : variant === "danger" ? "btn-pill-secondary btn-pill-danger" : "btn-pill-secondary";
  const [run, setRun] = useState<"idle" | "busy" | "success" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef(true);
  useEffect(() => {
    // Set on every mount: React's dev double-mount runs the cleanup once before the real mount.
    live.current = true;
    return () => {
      live.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const settle = (to: "success" | "error") => {
    if (!live.current) return;
    setRun(to);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => live.current && setRun("idle"), to === "success" ? 1400 : 2400);
  };
  const click = (e: React.MouseEvent<HTMLButtonElement>) => {
    const out = onClick?.(e);
    if (!out || typeof (out as Promise<unknown>).then !== "function") return;
    setRun("busy");
    (out as Promise<boolean | void>).then(
      (ok) => (ok === true ? settle("success") : ok === false ? settle("error") : live.current && setRun("idle")),
      () => settle("error"),
    );
  };
  const busy = loading || run === "busy";
  const shown = state !== "default" ? state : run === "success" || run === "error" ? run : "default";

  return (
    <button
      type="button"
      className={`btn-pill ${variantClass} ${className}`.trim()}
      aria-pressed={pressed}
      aria-busy={busy || undefined}
      data-loading={busy ? "true" : undefined}
      data-state={shown !== "default" ? shown : undefined}
      // While loading the button keeps focus (aria-disabled, not disabled) but ignores clicks.
      disabled={disabled}
      aria-disabled={busy || undefined}
      onClick={busy ? (e) => e.preventDefault() : click}
      {...props}
    >
      {busy ? (
        <span className="btn-pill-spinner" aria-hidden="true" />
      ) : shown === "success" ? (
        <svg className="btn-pill-tick" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="5 12.5 10 17.5 19 7" />
        </svg>
      ) : (
        icon && <span className="btn-pill-icon">{icon}</span>
      )}
      <span>{children}</span>
      {trailing}
      {hasDropdown && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginLeft: 2 }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
}
