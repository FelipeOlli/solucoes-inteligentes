"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { clearToken } from "@/lib/api";
import { getStoredTheme, setStoredTheme, THEME_LABELS, type ThemeId } from "@/lib/theme";

// Ordem = prioridade de exibição na barra: os últimos são os primeiros a
// cair no menu hamburguer quando a janela encolhe (ver medição em NavBar).
const NAV_LINKS: { href: string; label: string; prefix?: boolean }[] = [
  { href: "/dashboard", label: "Serviços" },
  { href: "/dashboard/agenda", label: "Agenda" },
  { href: "/dashboard/clientes", label: "Clientes" },
  { href: "/dashboard/orcamento", label: "Orçamento" },
  { href: "/dashboard/financeiro", label: "Financeiro" },
  { href: "/dashboard/documentos-fiscais", label: "Contabilidade" },
  { href: "/dashboard/marketing", label: "Marketing", prefix: true },
  { href: "/dashboard/tecnicos", label: "Técnicos" },
  { href: "/dashboard/usuarios", label: "Usuários" },
  { href: "/dashboard/categorias", label: "Categorias" },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  const navContainerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && !localStorage.getItem("si_token")) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (mounted) setTheme(getStoredTheme());
  }, [mounted]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Mede quantos itens de NAV_LINKS cabem na largura disponível e move o
  // resto para o drawer. A camada de medição (measureRef) fica oculta e
  // renderiza todos os itens em negrito (largura máxima) pra o cálculo ser
  // conservador e não estourar quando o item ativo ganha font-semibold.
  useLayoutEffect(() => {
    if (!mounted) return;
    const container = navContainerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    function recalc() {
      const container = navContainerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;
      const available = container.clientWidth;
      const items = Array.from(measure.children) as HTMLElement[];
      const gap = parseFloat(getComputedStyle(measure).columnGap || "0") || 0;

      let total = 0;
      let count = 0;
      for (const item of items) {
        const width = item.offsetWidth;
        const next = total + (count > 0 ? gap : 0) + width;
        if (next > available) break;
        total = next;
        count++;
      }
      setVisibleCount((prev) => (prev === count ? prev : count));
    }

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(container);
    document.fonts?.ready.then(recalc);
    return () => observer.disconnect();
  }, [mounted, theme]);

  function handleThemeChange(t: ThemeId) {
    setStoredTheme(t);
    setTheme(t);
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
          className="rounded-full border px-4 md:px-5 py-2.5 shadow-lg backdrop-blur-md transition-colors"
          style={{
            backgroundColor: "var(--color-navbar)",
            borderColor: "var(--color-navbar-border)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-6 min-w-0 flex-1">
              <Link href="/dashboard" className="flex items-center shrink-0">
                <Image
                  src={theme === "dark" || theme === "brand-blue" ? "/logo/logo-simbolo-branco.svg" : "/favicon.svg"}
                  alt="Soluções Inteligentes"
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
              </Link>
              <div ref={navContainerRef} className="flex-1 min-w-0 overflow-hidden">
                <nav className="flex gap-4 whitespace-nowrap text-sm" style={{ color: "var(--color-navbar-text-muted)" }}>
                  {NAV_LINKS.slice(0, visibleCount).map((l) => (
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
                {/* Camada de medição: invisível, renderiza todos os itens em negrito
                    (largura máxima) pra calcular quantos cabem de verdade. */}
                <div
                  ref={measureRef}
                  aria-hidden
                  className="absolute invisible pointer-events-none flex gap-4 whitespace-nowrap text-sm font-semibold"
                >
                  {NAV_LINKS.map((l) => (
                    <span key={l.href}>{l.label}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSair}
                className="text-sm font-medium rounded-full px-3 md:px-4 py-2 transition"
                style={{
                  backgroundColor: "var(--color-cta-bg)",
                  color: "var(--color-cta-text)",
                }}
              >
                Sair
              </button>
              <button
                type="button"
                className="p-2 rounded-full border"
                style={{ borderColor: "var(--color-navbar-border)", color: "var(--color-navbar-text)" }}
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={mobileNavOpen}
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay do drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          mobileNavOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden
        onClick={() => setMobileNavOpen(false)}
      />

      {/* Drawer lateral direito */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] shadow-2xl transition-transform duration-300 flex flex-col ${
          mobileNavOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ backgroundColor: "var(--color-navbar)", borderLeft: "1px solid var(--color-navbar-border)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu do dashboard"
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--color-navbar-border)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--color-navbar-text)" }}>
            Menu
          </span>
          <button
            type="button"
            className="p-2 rounded-full border"
            style={{ borderColor: "var(--color-navbar-border)", color: "var(--color-navbar-text)" }}
            onClick={() => setMobileNavOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4">
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
          <nav className="grid gap-1">
            {NAV_LINKS.slice(visibleCount).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-2 py-2 rounded-lg ${navLinkClass(isActive(l))}`}
                style={{ color: isActive(l) ? "var(--color-navbar-text)" : "inherit" }}
                onClick={() => setMobileNavOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <main className="max-w-6xl mx-auto px-4 pt-28 pb-6">{children}</main>
    </div>
  );
}
