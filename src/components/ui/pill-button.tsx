import React from "react";

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  hasDropdown?: boolean;
}

export function PillButton({
  variant = "primary",
  icon,
  hasDropdown,
  children,
  className = "",
  ...props
}: PillButtonProps) {
  const variantClass = variant === "primary" ? "btn-pill-primary" : "btn-pill-secondary";

  return (
    <button
      type="button"
      className={`btn-pill ${variantClass} ${className}`}
      {...props}
    >
      {icon && <span className="btn-pill-icon">{icon}</span>}
      <span>{children}</span>
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
