"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { clearToken } from "@/lib/api";
import { getStoredTheme, setStoredTheme, THEME_LABELS, type ThemeId } from "@/lib/theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("default");
  const [themeOpen, setThemeOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && !localStorage.getItem("si_token")) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (mounted) setTheme(getStoredTheme());
  }, [mounted]);

  function handleThemeChange(t: ThemeId) {
    setStoredTheme(t);
    setTheme(t);
    setThemeOpen(false);
  }

  function handleSair() {
    clearToken();
    router.push("/login");
    router.refresh();
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-page)" }}>
        <p className="text-body" style={{ color: "var(--color-text)" }}>Carregando…</p>
      </div>
    );
  }

  const navLinkClass = (active: boolean) =>
    `text-sm transition opacity-90 hover:opacity-100 ${active ? "font-semibold underline" : ""}`;

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: "var(--color-bg-page)" }}>
      {/* Barra no estilo pill: fundo da página + barra arredondada centralizada */}
      <header className="pt-4 pb-2 px-4">
        <div
          className="max-w-5xl mx-auto rounded-full border flex items-center justify-between gap-4 px-5 py-2.5 shadow-sm transition-colors"
          style={{
            backgroundColor: "var(--color-navbar)",
            borderColor: "var(--color-navbar-border)",
          }}
        >
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: "var(--color-cta-bg)" }}
              >
                <Image
                  src={theme === "dark" || theme === "brand-blue" ? "/favicon.svg" : "/logo/logo-simbolo-branco.svg"}
                  alt="Soluções Inteligentes"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </span>
              <Image
                src={theme === "dark" || theme === "brand-blue" ? "/logo/logo-branco.svg" : "/logo/logo-azul.svg"}
                alt="Soluções Inteligentes"
                width={140}
                height={16}
                className="h-5 w-auto hidden sm:block"
              />
            </Link>
            <nav className="flex gap-5 text-sm shrink-0" style={{ color: "var(--color-navbar-text-muted)" }}>
              <Link
                href="/dashboard"
                className={navLinkClass(pathname === "/dashboard")}
                style={{ color: pathname === "/dashboard" ? "var(--color-navbar-text)" : "inherit" }}
              >
                Serviços
              </Link>
              <Link
                href="/dashboard/clientes"
                className={navLinkClass(pathname === "/dashboard/clientes")}
                style={{ color: pathname === "/dashboard/clientes" ? "var(--color-navbar-text)" : "inherit" }}
              >
                Clientes
              </Link>
              <Link
                href="/dashboard/categorias"
                className={navLinkClass(pathname === "/dashboard/categorias")}
                style={{ color: pathname === "/dashboard/categorias" ? "var(--color-navbar-text)" : "inherit" }}
              >
                Categorias
              </Link>
              <Link
                href="/dashboard/usuarios"
                className={navLinkClass(pathname === "/dashboard/usuarios")}
                style={{ color: pathname === "/dashboard/usuarios" ? "var(--color-navbar-text)" : "inherit" }}
              >
                Usuários
              </Link>
              <Link
                href="/dashboard/servicos/novo"
                className="font-medium"
                style={{ color: "var(--color-navbar-text)" }}
              >
                + Novo serviço
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Seletor de tema */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeOpen((o) => !o)}
                className="text-sm px-3 py-1.5 rounded-full border transition"
                style={{
                  color: "var(--color-navbar-text-muted)",
                  borderColor: "var(--color-navbar-border)",
                }}
                aria-expanded={themeOpen}
                aria-haspopup="listbox"
              >
                {THEME_LABELS[theme]}
              </button>
              {themeOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setThemeOpen(false)} />
                  <ul
                    className="absolute right-0 top-full mt-1 py-1 rounded-xl border shadow-lg z-20 min-w-[140px]"
                    style={{
                      backgroundColor: "var(--color-navbar)",
                      borderColor: "var(--color-navbar-border)",
                    }}
                    role="listbox"
                  >
                    {(["default", "dark", "brand-blue"] as const).map((t) => (
                      <li key={t} role="option" aria-selected={theme === t}>
                        <button
                          type="button"
                          onClick={() => handleThemeChange(t)}
                          className="w-full text-left px-4 py-2 text-sm hover:opacity-90"
                          style={{ color: "var(--color-navbar-text)" }}
                        >
                          {THEME_LABELS[t]}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleSair}
              className="text-sm font-medium rounded-full px-4 py-2 transition"
              style={{
                backgroundColor: "var(--color-cta-bg)",
                color: "var(--color-cta-text)",
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
