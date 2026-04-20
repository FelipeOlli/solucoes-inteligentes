"use client";

import { useEffect, useRef, useState } from "react";

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
      <input
        id="busca-fiscal"
        type="text"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar por competência, valor, CNPJ, nº do documento... (Cmd+K)"
        className="w-full px-4 py-3 rounded-lg border border-theme bg-theme-card text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {valor && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted text-xs"
          onClick={() => setValor("")}
        >
          Limpar
        </button>
      )}
    </div>
  );
}
