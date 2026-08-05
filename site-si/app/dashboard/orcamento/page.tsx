"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import RepositorioAnexos from "@/components/orcamento/RepositorioAnexos";

const FIXO = 50;
const IMPOSTO_NF_PCT = 5; // imposto por emissão de nota, % em cima do valor final

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

const MARGENS_RAPIDAS = [30, 40, 50];

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
}

export default function OrcamentoPage() {
  const [valorServico, setValorServico] = useState("");
  const [valorMaterial, setValorMaterial] = useState("");
  // margem: pct selecionado (30/40/50) ou null = personalizado
  const [margemPct, setMargemPct] = useState<number | null>(30);
  const [margemCustom, setMargemCustom] = useState("");
  const [metodo, setMetodo] = useState<MetodoPagamento>("maquininha");
  const [parcelas, setParcelas] = useState(1);

  // cliente
  const [clienteQuery, setClienteQuery] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const clienteFocado = useRef(false);

  // descrição
  const [descricao, setDescricao] = useState("");

  // estado do botão
  const [gerando, setGerando] = useState(false);

  const vS = Number(valorServico.replace(/,/g, ".")) || 0;
  const vM = Number(valorMaterial.replace(/,/g, ".")) || 0;
  const A1 = vS + vM;

  const personalizadoAtivo = margemPct === null;
  const lucroAplicado = personalizadoAtivo
    ? (Number(margemCustom.replace(/,/g, ".")) || 0)
    : A1 * ((margemPct ?? 30) / 100);
  const liquidoDesejado = A1 + lucroAplicado;

  const taxaPct = metodo === "avista" ? 0 : TAXAS[metodo][parcelas - 1];
  const coef = 1 - (taxaPct + IMPOSTO_NF_PCT) / 100;
  const resultado = liquidoDesejado >= 0 ? liquidoDesejado / coef + FIXO : 0;
  const valorParcela = resultado / parcelas;
  const valorImposto = resultado * (IMPOSTO_NF_PCT / 100);

  const exibirResultado = valorServico !== "" || valorMaterial !== "";
  const metodoAtual = METODOS.find((m) => m.id === metodo)!;

  async function buscarClientes(q: string) {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
      const url = q.trim() ? `/api/clientes?q=${encodeURIComponent(q.trim())}` : "/api/clientes";
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setClientes(data.slice(0, 8));
        setShowDropdown(true);
      }
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    if (clienteSelecionado || !clienteFocado.current) return;
    const timer = setTimeout(() => buscarClientes(clienteQuery), 200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteQuery, clienteSelecionado]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleMetodoChange(novoMetodo: MetodoPagamento) {
    setMetodo(novoMetodo);
    const max = METODOS.find((m) => m.id === novoMetodo)!.maxParcelas;
    if (parcelas > max) setParcelas(1);
  }

  function selecionarCliente(c: Cliente) {
    setClienteSelecionado(c);
    setClienteQuery(c.nome);
    setShowDropdown(false);
    setClientes([]);
  }

  function limparCliente() {
    setClienteSelecionado(null);
    setClienteQuery("");
  }

  async function gerarPDF() {
    if (!exibirResultado) return;
    setGerando(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
      const res = await fetch("/api/orcamento/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clienteId: clienteSelecionado?.id ?? null,
          descricao: descricao.trim() || null,
          valor: resultado,
          metodo,
          parcelas,
          taxaPct,
          valorParcela,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || `Erro ${res.status} ao gerar PDF`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nomeBase = clienteSelecionado
        ? clienteSelecionado.nome.replace(/[^a-zA-Z0-9À-ú ]/g, "").replace(/\s+/g, "_")
        : `Orcamento_${new Date().toISOString().slice(0, 10)}`;
      a.download = `Si_${nomeBase}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro de rede ao gerar PDF");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="text-theme">
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-2">Orçamento</h1>
      <p className="text-body text-theme-muted mb-6">Informe os valores para calcular o valor final e gerar o PDF do orçamento.</p>

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
            <label className="block text-sm font-medium text-theme-muted mb-1">Margem de lucro</label>
            <div className="flex gap-2 flex-wrap">
              {MARGENS_RAPIDAS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => { setMargemPct(pct); setMargemCustom(""); }}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                    margemPct === pct
                      ? "bg-primary text-white border-primary"
                      : "border-theme text-theme hover:opacity-80"
                  }`}
                >
                  {pct}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMargemPct(null)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                  personalizadoAtivo
                    ? "bg-primary text-white border-primary"
                    : "border-theme text-theme hover:opacity-80"
                }`}
              >
                Personalizado
              </button>
            </div>
            {personalizadoAtivo && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-theme-muted">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={margemCustom}
                  onChange={(e) => setMargemCustom(e.target.value.replace(/[^0-9,.-]/g, ""))}
                  placeholder="0,00"
                  autoFocus
                  className="w-36 px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
            )}
            {!personalizadoAtivo && A1 > 0 && (
              <p className="text-xs text-theme-muted mt-1">Lucro estimado: {formatBRL(lucroAplicado)}</p>
            )}
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

          {/* Seletor de cliente */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium text-theme-muted mb-1">Cliente <span className="font-normal text-theme-muted">(opcional)</span></label>
            <div className="flex gap-2">
              <input
                type="text"
                value={clienteQuery}
                onChange={(e) => {
                  setClienteQuery(e.target.value);
                  if (clienteSelecionado) limparCliente();
                }}
                onFocus={() => {
                  if (!clienteSelecionado) {
                    clienteFocado.current = true;
                    buscarClientes(clienteQuery);
                  }
                }}
                placeholder="Buscar cliente..."
                className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
              />
              {clienteSelecionado && (
                <button
                  onClick={limparCliente}
                  className="px-3 py-2 rounded-lg border border-theme text-theme-muted hover:text-theme text-sm"
                >
                  ✕
                </button>
              )}
            </div>
            {showDropdown && clientes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-theme-card border border-theme rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {clientes.map((c) => (
                  <button
                    key={c.id}
                    onMouseDown={() => selecionarCliente(c)}
                    className="w-full text-left px-4 py-2 hover:bg-theme-hover text-sm"
                  >
                    <span className="font-medium text-theme">{c.nome}</span>
                    <span className="text-theme-muted ml-2">{c.telefone}</span>
                  </button>
                ))}
              </div>
            )}
            {clienteSelecionado && (
              <p className="text-xs text-theme-muted mt-1">
                {clienteSelecionado.email} · {clienteSelecionado.telefone}
              </p>
            )}
          </div>

          {/* Descrição do serviço */}
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Descrição do serviço <span className="font-normal text-theme-muted">(opcional)</span></label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Troca do display (Samsung A325M/DS)"
              rows={2}
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme resize-none"
            />
          </div>

        </div>

        {exibirResultado && (
          <div className="mt-3 space-y-1 text-xs text-theme-muted border-t border-theme pt-3">
            <p className="flex justify-between">
              <span>Taxa aplicada{metodo !== "avista" ? ` (${metodoAtual.label}, ${parcelas}×)` : ""}</span>
              <span className="font-medium">{taxaPct.toFixed(2).replace(".", ",")}%</span>
            </p>
            <p className="flex justify-between">
              <span>Imposto emissão de NF ({IMPOSTO_NF_PCT}%)</span>
              <span className="font-medium">{formatBRL(valorImposto)}</span>
            </p>
            <p className="flex justify-between">
              <span>Custo fixo (transporte)</span>
              <span className="font-medium">{formatBRL(FIXO)}</span>
            </p>
          </div>
        )}

        {exibirResultado && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={gerarPDF}
              disabled={gerando}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-theme-cta font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {gerando ? "Gerando..." : "Gerar PDF do orçamento"}
            </button>
            <Link
              href={`/dashboard/servicos/novo?valor=${encodeURIComponent(resultado.toFixed(2))}`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-theme font-medium text-sm hover:opacity-90"
            >
              Novo serviço com valor final
            </Link>
          </div>
        )}
      </div>

      <RepositorioAnexos />
    </div>
  );
}
