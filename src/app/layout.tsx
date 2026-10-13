import "@fontsource-variable/inter/opsz.css";
import "./globals.css";
// Devices views load on demand; their stylesheets live here so Turbopack's
// CSS hot reload always finds a <link> to swap ("No link element found").
import "@/components/ui/page.css";
import "@/components/assets/hierarchy/hierarchy.css";
import "@/components/devices/mqtt.css";
import "@/components/devices/formats/formats.css";
import "@/components/devices/hierarchy/devices-hierarchy.css";
import Script from "next/script";
import { ThemeProvider } from "@/providers/theme-provider";

export const metadata = {
  title: "ULTRON",
  description: "Industrial operations software",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><Script id="theme-init" strategy="beforeInteractive">{`(function(){var saved=localStorage.getItem('ultron-theme');var dark=saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';})();`}</Script><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
