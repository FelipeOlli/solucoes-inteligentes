"use client";

import { useEffect } from "react";
import { applyStoredTheme } from "@/lib/theme";

/** Aplica o tema salvo ao carregar (evita flash). */
export function ThemeScript() {
  useEffect(() => {
    applyStoredTheme();
  }, []);
  return null;
}
