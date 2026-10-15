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
}

export function PillButton({
  variant = "primary",
  icon,
  hasDropdown,
  children,
  className = "",
  pressed,
  trailing,
  ...props
}: PillButtonProps) {
  const variantClass = variant === "primary" ? "btn-pill-primary" : variant === "danger" ? "btn-pill-secondary btn-pill-danger" : "btn-pill-secondary";

  return (
    <button
      type="button"
      className={`btn-pill ${variantClass} ${className}`.trim()}
      aria-pressed={pressed}
      {...props}
    >
      {icon && <span className="btn-pill-icon">{icon}</span>}
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
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
}
