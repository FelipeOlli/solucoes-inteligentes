"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Wrench,
  CalendarDays,
  Users,
  Calculator,
  Wallet,
  FileText,
  Megaphone,
  HardHat,
  ShieldCheck,
  Tags,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Marca o item ativo também em rotas filhas (ex.: /dashboard/marketing/...). */
  prefix?: boolean;
};

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Serviços", icon: Wrench },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/orcamento", label: "Orçamento", icon: Calculator },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/dashboard/documentos-fiscais", label: "Contabilidade", icon: FileText },
  { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone, prefix: true },
  { href: "/dashboard/tecnicos", label: "Técnicos", icon: HardHat },
  { href: "/dashboard/usuarios", label: "Usuários", icon: ShieldCheck },
  { href: "/dashboard/categorias", label: "Categorias", icon: Tags },
];

export function SidebarNav({
  onNavigate,
  badgeCount,
}: {
  onNavigate?: () => void;
  badgeCount?: number;
}) {
  const pathname = usePathname();

  const isActive = (l: NavLink) =>
    l.prefix ? pathname.startsWith(l.href) : pathname === l.href;

  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((l) => {
        const active = isActive(l);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={cn(
              "flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-all duration-300",
              active
                ? "bg-brand text-brand-fg shadow-brand"
                : "text-ink-muted hover:bg-surface-hover hover:text-ink"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{l.label}</span>
            {l.href === "/dashboard" && badgeCount != null && badgeCount > 0 && (
              <span
                className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active ? "bg-brand-fg/20 text-brand-fg" : "bg-brand text-brand-fg"
                )}
              >
                {badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand({
  dark,
}: {
  dark: boolean;
}) {
  return (
    <Link href="/dashboard" className="mb-6 flex items-center gap-2.5">
      <Image
        src={dark ? "/logo/logo-simbolo-branco.svg" : "/favicon.svg"}
        alt="Soluções Inteligentes"
        width={32}
        height={32}
        className="h-8 w-8"
      />
      <span className="font-heading text-lg font-semibold text-ink">Soluções Inteligentes</span>
    </Link>
  );
}

export function SidebarFooter({
  onSair,
}: {
  onSair: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSair}
      className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-medium text-ink-muted transition-all duration-300 hover:bg-surface-hover hover:text-ink"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      Sair
    </button>
  );
}
