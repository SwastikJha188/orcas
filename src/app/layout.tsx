import "@fontsource-variable/inter/opsz.css";
import "./globals.css";
// Devices views load on demand; their stylesheets live here so Turbopack's
// CSS hot reload always finds a <link> to swap ("No link element found").
import "@/components/ui/page.css";
import "@/components/assets/hierarchy/hierarchy.css";
import "@/components/devices/mqtt.css";
import "@/components/devices/formats/formats.css";
import "@/components/devices/hierarchy/devices-hierarchy.css";
// Responsive layer: viewport tiers from phone to TV (see foundation.css).
import "@/styles/responsive/foundation.css";
import "@/styles/responsive/home.css";
import "@/styles/responsive/assets-workspace.css";
import "@/styles/responsive/machine-diagnostics.css";
import "@/styles/responsive/machine-insights.css";
import "@/styles/responsive/machine-condition.css";
import "@/styles/responsive/devices-assetiq-configure.css";
import "@/styles/responsive/open-sections.css";
import "@/styles/responsive/headings.css";
import "@/styles/dark-palettes.css";
import Script from "next/script";
import type { Viewport } from "next";
import { ThemeProvider } from "@/providers/theme-provider";

export const metadata = {
  title: "ULTRON",
  description: "Industrial operations software",
};

// viewport-fit=cover lets the phone tab bar sit above the home indicator via safe-area insets.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><Script id="theme-init" strategy="beforeInteractive">{`(function(){var saved=localStorage.getItem('ultron-theme');var dark=saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';var p=localStorage.getItem('ultron-dark-palette');document.documentElement.dataset.palette=p==='green'||p==='blue'?p:'grey';})();`}</Script><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
