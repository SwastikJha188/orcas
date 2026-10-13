"use client";

import React from "react";

export interface PillNavItem {
  id: string;
  label: string;
}

export interface PillNavProps {
  items: PillNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  wrap?: boolean;
  style?: React.CSSProperties;
}

export function PillNav({ items, activeId, onChange, className = "", wrap = false, style }: PillNavProps) {
  return (
    <nav
      className={`nav-pill-group ${wrap ? "nav-pill-wrap" : ""} ${className}`}
      role="tablist"
      style={style}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`nav-pill ${isActive ? "active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
