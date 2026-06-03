// ClinicPro — Per-doctor theme using CSS variables
import { useEffect } from "react";
import { getActiveDoctor } from "@/lib/settings";

const THEMES = {
  1: {
    "--primary": "37 99 235",        // blue-600
    "--primary-dark": "29 78 216",   // blue-700
    "--primary-light": "219 234 254",// blue-100
    "--primary-text": "255 255 255",
    "--accent": "59 130 246",        // blue-500
    "--header-from": "#2563eb",
    "--header-to": "#1d4ed8",
  },
  2: {
    "--primary": "5 150 105",        // emerald-600
    "--primary-dark": "4 120 87",    // emerald-700
    "--primary-light": "209 250 229",// emerald-100
    "--primary-text": "255 255 255",
    "--accent": "16 185 129",        // emerald-500
    "--header-from": "#059669",
    "--header-to": "#047857",
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const doctor = getActiveDoctor();
  const doctorId = doctor?.id || 1;

  useEffect(() => {
    const theme = THEMES[doctorId];
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    // Also set data attribute for CSS selectors
    root.setAttribute("data-doctor", String(doctorId));
  }, [doctorId]);

  return <>{children}</>;
}
