"use client";

import type React from "react";
import { useEffect, useRef } from "react";

const ITEMS = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

/**
 * Keyboard behaviour for a small pop-up menu: opening it moves focus to the
 * checked (or first) item, Up / Down / Home / End move between items, and Esc,
 * Tab or a choice hands focus back to the button that opened it.
 */
export function useMenuFocus(open: boolean, close: () => void) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? []);

  useEffect(() => {
    if (!open) return;
    const list = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? []);
    (list.find((el) => el.getAttribute("aria-checked") === "true") ?? list[0])?.focus();
  }, [open]);

  /** Close and put focus back on the menu button (before any action that moves focus elsewhere). */
  const closeToTrigger = () => {
    triggerRef.current?.focus({ preventScroll: true });
    close();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "ArrowDown":
        list[(i + 1) % list.length]?.focus();
        break;
      case "ArrowUp":
        list[(i - 1 + list.length) % list.length]?.focus();
        break;
      case "Home":
        list[0]?.focus();
        break;
      case "End":
        list[list.length - 1]?.focus();
        break;
      case "Escape":
      case "Tab":
        closeToTrigger();
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  /** Callback ref for the menu element (any element type). */
  const setMenu = (el: HTMLElement | null) => {
    menuRef.current = el;
  };

  return { triggerRef, menuRef: setMenu, onMenuKeyDown, closeToTrigger };
}
