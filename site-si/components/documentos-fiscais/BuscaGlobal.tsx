"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  onBusca: (q: string) => void;
};

export function BuscaGlobal({ onBusca }: Props) {
  const [valor, setValor] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onBusca(valor), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [valor, onBusca]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("busca-fiscal")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <Input
        id="busca-fiscal"
        type="text"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar por competência, valor, CNPJ, nº do documento... (Cmd+K)"
        className="pl-9 pr-16"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted md:inline-block">
        ⌘K
      </kbd>
      {valor && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted"
          onClick={() => setValor("")}
        >
          Limpar
        </button>
      )}
    </div>
  );
}
