"use client";

import React, { useEffect, useRef } from "react";

export interface PillNavItem<T extends string = string> {
  id: T;
  label: string;
  /** Optional node before the label (e.g. a status dot). */
  prefix?: React.ReactNode;
  /** Optional node after the label (e.g. a count). */
  suffix?: React.ReactNode;
}

export interface PillNavProps<T extends string = string> {
  items: PillNavItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  wrap?: boolean;
  style?: React.CSSProperties;
  /** Accessible name of the tab list. */
  ariaLabel?: string;
  /** Show prev/next arrow stepper buttons to cycle through items. */
  arrows?: boolean;
}

export function PillNav<T extends string = string>({
  items,
  activeId,
  onChange,
  className = "",
  wrap = false,
  style,
  ariaLabel,
  arrows = false,
}: PillNavProps<T>) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const activeIdx = items.findIndex((item) => item.id === activeId);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeEl = nav.querySelector<HTMLElement>(".nav-pill.active");
    if (!activeEl) return;
    // Scroll only the horizontal pill container if it overflows, never the page.
    if (nav.scrollWidth > nav.clientWidth) {
      const targetLeft = activeEl.offsetLeft - nav.clientWidth / 2 + activeEl.offsetWidth / 2;
      const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      nav.scrollTo({ left: Math.max(0, targetLeft), behavior: calm ? "auto" : "smooth" });
    }
  }, [activeId]);

  const step = (delta: number) => {
    if (items.length === 0) return;
    const base = activeIdx >= 0 ? activeIdx : 0;
    const nextIdx = (base + delta + items.length) % items.length;
    onChange(items[nextIdx].id);
  };

  // Tabs pattern: one tab stop for the whole row, arrows / Home / End move and select.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: number | null = null;
    if (e.key in keys) next = ((activeIdx >= 0 ? activeIdx : 0) + keys[e.key] + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next === null || items.length === 0) return;
    e.preventDefault();
    onChange(items[next].id);
    navRef.current?.querySelectorAll<HTMLButtonElement>(".nav-pill")[next]?.focus();
  };
  const tabStop = activeIdx >= 0 ? activeIdx : 0;

  const navNode = (
    <div
      ref={navRef}
      className={`nav-pill-group ${wrap ? "nav-pill-wrap" : "nav-pill-scroll"} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      style={style}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={i === tabStop ? 0 : -1}
            className={`nav-pill ${isActive ? "active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            {item.prefix}
            {item.label}
            {item.suffix}
          </button>
        );
      })}
    </div>
  );

  if (!arrows || items.length <= 1) return navNode;

  return (
    <div className="nav-pill-bar">
      {navNode}
      <div className="nav-pill-stepper" role="group" aria-label="Step through options">
        <button
          type="button"
          className="nav-pill-step-btn"
          onClick={() => step(-1)}
          aria-label="Previous option"
          title="Previous"
        >
          ‹
        </button>
        <button
          type="button"
          className="nav-pill-step-btn"
          onClick={() => step(1)}
          aria-label="Next option"
          title="Next"
        >
          ›
        </button>
      </div>
    </div>
  );
}

