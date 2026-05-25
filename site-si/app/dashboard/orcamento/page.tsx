"use client";

import { useState } from "react";
import Link from "next/link";

const FIXO = 50;

type MetodoPagamento = "maquininha" | "tap" | "link" | "avista";

const TAXAS: Record<Exclude<MetodoPagamento, "avista">, number[]> = {
  maquininha: [3.99, 8.99, 9.99, 11.99, 13.49, 15.49, 16.99, 17.99, 18.99, 19.99, 19.99, 19.99],
  tap:        [3.99, 8.99, 9.99, 11.99, 13.49, 15.49, 16.99, 17.99, 18.99, 19.99, 19.99, 19.99],
  link:       [5.90, 10.90, 11.90, 12.90, 13.99, 14.59, 16.59, 17.59, 17.90, 20.90, 21.99, 22.90],
};

const METODOS: { id: MetodoPagamento; label: string; maxParcelas: number }[] = [
  { id: "avista",     label: "À vista (Pix / Dinheiro)",  maxParcelas: 1  },
  { id: "maquininha", label: "Maquininha (D+1)",          maxParcelas: 12 },
  { id: "tap",        label: "Tap to Pay (D+1)",          maxParcelas: 12 },
  { id: "link",       label: "Link de pagamento (D+2)",   maxParcelas: 12 },
];

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function OrcamentoPage() {
  const [valorServico, setValorServico] = useState("");
  const [valorMaterial, setValorMaterial] = useState("");
  const [lucro, setLucro] = useState("");
  const [metodo, setMetodo] = useState<MetodoPagamento>("maquininha");
  const [parcelas, setParcelas] = useState(1);

  const vS = Number(valorServico.replace(/,/g, ".")) || 0;
  const vM = Number(valorMaterial.replace(/,/g, ".")) || 0;
  const A1 = vS + vM;
  const lucroEstimado = A1 * 0.3;
  const lucroAplicado = lucro.trim() !== "" ? (Number(lucro.replace(/,/g, ".")) || 0) : lucroEstimado;
  const liquidoDesejado = A1 + lucroAplicado;

  const taxaPct = metodo === "avista" ? 0 : TAXAS[metodo][parcelas - 1];
  const coef = 1 - taxaPct / 100;
  const resultado = liquidoDesejado >= 0 ? liquidoDesejado / coef + FIXO : 0;
  const valorParcela = resultado / parcelas;

  const exibirResultado = valorServico !== "" || valorMaterial !== "";

  const metodoAtual = METODOS.find((m) => m.id === metodo)!;

  function handleMetodoChange(novoMetodo: MetodoPagamento) {
    setMetodo(novoMetodo);
    const max = METODOS.find((m) => m.id === novoMetodo)!.maxParcelas;
    if (parcelas > max) setParcelas(1);
  }

  return (
    <div className="text-theme">
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
            <label className="block text-sm font-medium text-theme-muted mb-1">Forma de pagamento</label>
            <select
              value={metodo}
              onChange={(e) => handleMetodoChange(e.target.value as MetodoPagamento)}
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            >
              {METODOS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {metodoAtual.maxParcelas > 1 && (
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-1">Parcelas</label>
              <select
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
              >
                {Array.from({ length: metodoAtual.maxParcelas }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}×</option>
                ))}
              </select>
            </div>
          )}

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

        {exibirResultado && (
          <div className="mt-3 space-y-1 text-xs text-theme-muted">
            <p>
              Taxa aplicada: <span className="font-medium">{taxaPct.toFixed(2).replace(".", ",")}%</span>
              {metodo !== "avista" && ` (${metodoAtual.label})`}
            </p>
            {parcelas > 1 && (
              <p>
                Parcela: <span className="font-medium">{formatBRL(valorParcela)}</span> × {parcelas}
              </p>
            )}
          </div>
        )}

        {exibirResultado && (
          <div className="mt-4">
            <Link
              href={`/dashboard/servicos/novo?valor=${encodeURIComponent(resultado.toFixed(2))}`}
              className="inline-flex px-4 py-2 rounded-lg bg-theme-cta font-medium hover:opacity-90"
            >
              Novo serviço com valor final
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
