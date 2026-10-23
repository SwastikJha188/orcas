"use client";

import { Check, Menu, useAnchoredMenu } from "@/components/context-switchers";
import { useTheme, type DarkPalette, type Theme } from "@/providers/theme-provider";

type Choice = { id: string; theme: Theme; palette?: DarkPalette; name: string; meta: string };

/** Light, then the three dark palettes. A light choice keeps the dark palette for next time. */
const CHOICES: Choice[] = [
  { id: "light", theme: "light", name: "Light", meta: "For bright rooms" },
  { id: "grey", theme: "dark", palette: "grey", name: "Dark grey", meta: "Neutral graphite" },
  { id: "green", theme: "dark", palette: "green", name: "Dark green", meta: "Graphite, soft green tint" },
  { id: "blue", theme: "dark", palette: "blue", name: "Dark blue", meta: "Graphite, soft blue tint" },
];

const MENU_W = 248;

export function ThemeToggle() {
  const { theme, setTheme, palette, setPalette } = useTheme();
  const m = useAnchoredMenu(MENU_W);
  const isDark = theme === "dark";
  const current = isDark ? CHOICES.find((c) => c.palette === palette) ?? CHOICES[1] : CHOICES[0];
  const label = `Theme: ${current.name}. Change`;

  return (
    <>
      <button
        ref={m.trigger}
        className="theme-toggle"
        type="button"
        aria-label={label}
        title={`Theme: ${current.name}`}
        aria-haspopup="menu"
        aria-expanded={m.open}
        data-open={m.open || undefined}
        onClick={() => {
          m.setOpen((o) => !o);
          m.focusFirst();
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {isDark ? (
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
            </>
          )}
        </svg>
      </button>
      {m.open && (
        <Menu innerRef={m.menu} pos={m.pos} width={MENU_W} label="Theme">
          <div className="ctx-menu-head">
            <span className="ctx-menu-title">Theme</span>
          </div>
          <div className="ctx-list">
            {CHOICES.map((c) => {
              const active = c.id === current.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  data-menu-item
                  className="ctx-row"
                  onClick={() => {
                    if (c.palette) setPalette(c.palette);
                    setTheme(c.theme);
                    m.close();
                  }}
                >
                  <Check on={active} />
                  <span className="theme-swatch" data-swatch={c.id} aria-hidden="true">
                    <span />
                  </span>
                  <span className="ctx-row-text">
                    <span className="ctx-row-name">{c.name}</span>
                    <span className="ctx-row-meta">{c.meta}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Menu>
      )}
    </>
  );
}
