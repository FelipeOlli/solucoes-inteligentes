"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { clearToken } from "@/lib/api";
import { getStoredTheme, setStoredTheme, THEME_LABELS, type ThemeId } from "@/lib/theme";

const NAV_LINKS: { href: string; label: string; prefix?: boolean }[] = [
  { href: "/dashboard", label: "Serviços" },
  { href: "/dashboard/agenda", label: "Agenda" },
  { href: "/dashboard/clientes", label: "Clientes" },
  { href: "/dashboard/categorias", label: "Categorias" },
  { href: "/dashboard/usuarios", label: "Usuários" },
  { href: "/dashboard/tecnicos", label: "Técnicos" },
  { href: "/dashboard/orcamento", label: "Orçamento" },
  { href: "/dashboard/documentos-fiscais", label: "Contabilidade" },
  { href: "/dashboard/financeiro", label: "Financeiro" },
  { href: "/dashboard/marketing", label: "Marketing", prefix: true },
];

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const navLinkClass = (active: boolean) =>
    `text-sm transition opacity-90 hover:opacity-100 ${active ? "font-semibold underline" : ""}`;
  const isActive = (l: (typeof NAV_LINKS)[number]) =>
    l.prefix ? pathname.startsWith(l.href) : pathname === l.href;
  const darkLikeTheme = theme === "dark" || theme === "brand-blue";

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: "var(--color-bg-page)" }}>
      {/* Barra fixa estilo pill inspirada no layout de referência */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-6xl">
        <div
          className="rounded-2xl lg:rounded-full border px-4 md:px-5 py-2.5 shadow-lg backdrop-blur-md transition-colors"
          style={{
            backgroundColor: "var(--color-navbar)",
            borderColor: "var(--color-navbar-border)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-6 min-w-0">
              <Link href="/dashboard" className="flex items-center shrink-0">
                <Image
                  src={theme === "dark" || theme === "brand-blue" ? "/logo/logo-simbolo-branco.svg" : "/favicon.svg"}
                  alt="Soluções Inteligentes"
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
              </Link>
              <nav className="hidden lg:flex gap-4 xl:gap-5 text-sm" style={{ color: "var(--color-navbar-text-muted)" }}>
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={navLinkClass(isActive(l))}
                    style={{ color: isActive(l) ? "var(--color-navbar-text)" : "inherit" }}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden lg:block">
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
                className="text-sm font-medium rounded-full px-3 lg:px-4 py-2 transition"
                style={{
                  backgroundColor: "var(--color-cta-bg)",
                  color: "var(--color-cta-text)",
                }}
              >
                Sair
              </button>
              <button
                type="button"
                className="lg:hidden p-2 rounded-full border"
                style={{ borderColor: "var(--color-navbar-border)", color: "var(--color-navbar-text)" }}
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-label="Abrir menu do dashboard"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {mobileNavOpen && (
            <nav
              className="lg:hidden mt-3 pt-3 border-t grid gap-2 max-h-[70vh] overflow-y-auto"
              style={{ borderColor: "var(--color-navbar-border)" }}
            >
              <div className="mb-2">
                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-navbar-text-muted)" }}>
                  Tema
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["default", "dark", "brand-blue"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleThemeChange(t)}
                      className="px-2 py-1.5 rounded-lg text-xs border transition"
                      style={{
                        color: theme === t ? "#ffffff" : (darkLikeTheme ? "#ffffff" : "var(--color-navbar-text)"),
                        backgroundColor: theme === t ? "var(--color-secondary)" : "transparent",
                        borderColor: theme === t ? "var(--color-secondary)" : "var(--color-navbar-border)",
                      }}
                    >
                      {THEME_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={navLinkClass(isActive(l))}
                  style={{ color: isActive(l) ? "var(--color-navbar-text)" : "inherit" }}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 pt-28 pb-6">{children}</main>
    </div>
  );
}
