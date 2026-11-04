"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { clearToken, api } from "@/lib/api";
import { getStoredTheme, setStoredTheme, THEME_LABELS, type ThemeId } from "@/lib/theme";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  SidebarBrand,
  SidebarFooter,
  SidebarNav,
} from "@/components/dashboard/Sidebar";

function ThemeSwitcher({ theme, onChange }: { theme: ThemeId; onChange: (t: ThemeId) => void }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
        Tema
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {(["default", "dark", "brand-blue"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "rounded-control border px-2 py-1.5 text-xs transition-colors",
              theme === t
                ? "border-brand bg-brand text-brand-fg"
                : "border-line text-ink-muted hover:bg-surface-hover hover:text-ink"
            )}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("default");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [abertos, setAbertos] = useState<number | undefined>(undefined);

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
    if (!mounted) return;
    api<{ abertos: number }>("/servicos/contagem").then(({ data }) => {
      if (data) setAbertos(data.abertos);
    });
  }, [mounted]);

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
      <div className="min-h-screen bg-surface-subtle">
        <p className="p-8 text-sm text-ink-muted">Carregando…</p>
      </div>
    );
  }

  const darkLikeTheme = theme === "dark" || theme === "brand-blue";

  const sidebarContent = (
    <>
      <SidebarBrand dark={darkLikeTheme} />

      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
        Menu
      </p>
      <SidebarNav badgeCount={abertos} />

      <div className="mt-6 border-t border-line pt-4">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
          Geral
        </p>
        <div className="mb-3">
          <ThemeSwitcher theme={theme} onChange={handleThemeChange} />
        </div>
        <SidebarFooter onSair={handleSair} />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface-subtle text-ink transition-colors">
      {/* Barra superior apenas no mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={mobileNavOpen}
          className="rounded-control border border-line p-2 text-ink transition-colors hover:bg-surface-hover"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="font-heading font-semibold">Soluções Inteligentes</span>
        <span className="w-9" />
      </header>

      {/* Sidebar fixa no desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-line bg-surface p-4 lg:flex">
        {sidebarContent}
      </aside>

      {/* Drawer no mobile */}
      <Sheet open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} side="left">
        <div className="flex h-full flex-col overflow-y-auto p-4">{sidebarContent}</div>
      </Sheet>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
