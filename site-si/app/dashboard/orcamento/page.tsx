"use client";

import { useState } from "react";
import Link from "next/link";

const FIXO = 50;
const COEF = 1 - 0.1291; // 0.8709

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function OrcamentoPage() {
  const [valorServico, setValorServico] = useState("");
  const [valorMaterial, setValorMaterial] = useState("");

  const vS = Number(valorServico.replace(/,/g, ".")) || 0;
  const vM = Number(valorMaterial.replace(/,/g, ".")) || 0;
  const A1 = vS + vM;
  const resultado = A1 >= 0 ? (A1 + FIXO) / COEF : 0;
  const exibirResultado = valorServico !== "" || valorMaterial !== "";

  return (
    <div className="text-theme">
      <Link href="/dashboard" className="text-theme-primary underline text-sm mb-4 inline-block">
        ← Voltar ao dashboard
      </Link>
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-2">Orçamento</h1>
      <p className="text-body text-theme-muted mb-6">
        Cálculo: (Valor do serviço + Valor do material + {FIXO}) ÷ (1 − 0,1291). A1 = serviço + material.
      </p>

      <div className="bg-theme-card p-6 rounded-lg border border-theme max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Valor do serviço (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={valorServico}
              onChange={(e) => setValorServico(e.target.value.replace(/[^0-9,.-]/g, ""))}
              placeholder="0,00"
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Valor do material (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={valorMaterial}
              onChange={(e) => setValorMaterial(e.target.value.replace(/[^0-9,.-]/g, ""))}
              placeholder="0,00"
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            />
          </div>
        </div>

        {exibirResultado && (
          <div className="mt-6 pt-4 border-t border-theme">
            <p className="text-sm text-theme-muted">
              A1 (serviço + material) = {formatBRL(A1)}
            </p>
            <p className="font-heading text-lg font-bold text-theme-primary mt-2">
              Orçamento = {formatBRL(resultado)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
