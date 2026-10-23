"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";
/** Tint of the dark theme's neutrals (src/styles/dark-palettes.css); grey is the base tokens. */
export type DarkPalette = "grey" | "green" | "blue";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  palette: DarkPalette;
  setPalette: (palette: DarkPalette) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = "ultron-theme";
const paletteKey = "ultron-dark-palette";

function isPalette(value: string | null): value is DarkPalette {
  return value === "grey" || value === "green" || value === "blue";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function applyPalette(palette: DarkPalette) {
  document.documentElement.dataset.palette = palette;
}

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [palette, setPaletteState] = useState<DarkPalette>("grey");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(storageKey) as Theme | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initialTheme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : systemTheme;
    const savedPalette = window.localStorage.getItem(paletteKey);
    const initialPalette = isPalette(savedPalette) ? savedPalette : "grey";
    setThemeState(initialTheme);
    setPaletteState(initialPalette);
    applyTheme(initialTheme);
    applyPalette(initialPalette);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (nextTheme) => {
      setThemeState(nextTheme);
      window.localStorage.setItem(storageKey, nextTheme);
      applyTheme(nextTheme);
    },
    toggleTheme: () => {
      const nextTheme = theme === "dark" ? "light" : "dark";
      setThemeState(nextTheme);
      window.localStorage.setItem(storageKey, nextTheme);
      applyTheme(nextTheme);
    },
    palette,
    setPalette: (nextPalette) => {
      setPaletteState(nextPalette);
      window.localStorage.setItem(paletteKey, nextPalette);
      applyPalette(nextPalette);
    },
  }), [theme, palette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
