import React from "react";

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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

  return (
    <button
      type="button"
      className={`btn-pill ${variantClass} ${className}`.trim()}
      aria-pressed={pressed}
      aria-busy={loading || undefined}
      data-loading={loading ? "true" : undefined}
      data-state={state !== "default" ? state : undefined}
      // While loading the button keeps focus (aria-disabled, not disabled) but ignores clicks.
      disabled={disabled}
      aria-disabled={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      {...props}
    >
      {loading ? (
        <span className="btn-pill-spinner" aria-hidden="true" />
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
