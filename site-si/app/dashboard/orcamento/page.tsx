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
  const [lucro, setLucro] = useState("");

  const vS = Number(valorServico.replace(/,/g, ".")) || 0;
  const vM = Number(valorMaterial.replace(/,/g, ".")) || 0;
  const lucroDigitado = Number(lucro.replace(/,/g, ".")) || 0;
  const A1 = vS + vM;
  const lucroEstimado = A1 * 0.3;
  const lucroAplicado = lucro.trim() !== "" ? lucroDigitado : FIXO;
  const resultado = A1 >= 0 ? (A1 + lucroAplicado) / COEF : 0;
  const exibirResultado = valorServico !== "" || valorMaterial !== "";

  return (
    <div className="text-theme">
      <Link href="/dashboard" className="text-theme-primary underline text-sm mb-4 inline-block">
        ← Voltar ao dashboard
      </Link>
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-2">Orçamento</h1>
      <p className="text-body text-theme-muted mb-6">Informe os valores para calcular o valor final do serviço.</p>

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
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Lucro (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={lucro}
              onChange={(e) => setLucro(e.target.value.replace(/[^0-9,.-]/g, ""))}
              placeholder={A1 > 0 ? formatBRL(lucroEstimado) : "Estimativa de 30%"}
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Valor final do serviço (R$)</label>
            <input
              type="text"
              value={exibirResultado ? formatBRL(resultado) : ""}
              readOnly
              placeholder="Calculado automaticamente"
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme font-semibold"
            />
          </div>
        </div>

        {exibirResultado && <p className="mt-4 text-xs text-theme-muted">Cálculo atualizado automaticamente.</p>}
      </div>
    </div>
  );
}
