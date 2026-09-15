"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import { getStoredTheme, type ThemeId } from "@/lib/theme";

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("default");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && !localStorage.getItem("si_token")) {
      router.replace("/login");
    } else {
      setTheme(getStoredTheme());
    }
  }, [router]);

  function handleSair() {
    clearToken();
    router.push("/");
    router.refresh();
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-page)" }}>
        <p className="text-body" style={{ color: "var(--color-text)" }}>Carregando…</p>
      </div>
    );
  }

  const darkLikeTheme = theme === "dark" || theme === "brand-blue";

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: "var(--color-bg-page)" }}>
      <header
        className="sticky top-0 z-50 border-b px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "var(--color-navbar)", borderColor: "var(--color-navbar-border)" }}
      >
        <Image
          src={darkLikeTheme ? "/logo/logo-simbolo-branco.svg" : "/favicon.svg"}
          alt="Soluções Inteligentes"
          width={28}
          height={28}
          className="h-7 w-7"
        />
        <button
          type="button"
          onClick={handleSair}
          className="text-sm font-medium rounded-full px-4 py-2 transition"
          style={{ backgroundColor: "var(--color-cta-bg)", color: "var(--color-cta-text)" }}
        >
          Sair
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
