export type ThemeId = "default" | "dark" | "brand-blue";

const STORAGE_KEY = "si_theme";

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "default";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "dark" || v === "brand-blue" || v === "default") return v;
  return "default";
}

export function setStoredTheme(theme: ThemeId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function applyStoredTheme(): void {
  if (typeof window === "undefined") return;
  const theme = getStoredTheme();
  document.documentElement.setAttribute("data-theme", theme);
}

export const THEME_LABELS: Record<ThemeId, string> = {
  default: "Padrão",
  dark: "Preto",
  "brand-blue": "Azul",
};
