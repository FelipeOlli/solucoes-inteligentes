"use client";

import { useState, useMemo } from "react";

/**
 * Calculadora de precificação alternativa — modelo Simples Nacional Anexo III.
 *
 * Calcula a carga tributária real a partir do RBT12 (DAS + ISS separados) e
 * usa a tabela de taxas SumUp por faixa de faturamento. Mantém suas próprias
 * regras, independentes da calculadora de orçamento rápido ao lado.
 */

// Taxas REAIS da conta da SI, lidas na calculadora do app SumUp em 11/08/2026.
// Visa/Mastercard, maquininha, recebimento D+1.
//
// Não use as tabelas do site da SumUp: elas não batem com esta conta. A
// fonte de verdade é o app → Calculadora de taxas. Reconfira se o
// faturamento mensal mudar de faixa.
//
// As demais entradas abaixo ("tabela do site") são só simulação por faixa
// de faturamento, lidas em 11/08/2026. "Receba na hora" e "1 dia" são
// idênticas nelas.
const TAXAS = {
  contaSI: {
    rotulo: "Conta SI (taxas reais — app SumUp, 11/08/2026)",
    pix: 0,
    debito: null as number | null, // ainda não confirmado no app
    credito: [0.049, 0.098, 0.111, 0.125, 0.138, 0.151, 0.164, 0.177, 0.19, 0.201],
  },
  ate20k: {
    rotulo: "Até R$ 20 mil/mês (tabela do site)",
    pix: 0,
    debito: 0.0099 as number | null,
    credito: [
      0.0349, 0.0649, 0.0749, 0.0799, 0.0849, 0.0949, 0.0999, 0.1049, 0.1099,
      0.1149, 0.1249, 0.1399,
    ],
  },
  de20a50k: {
    rotulo: "R$ 20 mil a R$ 50 mil/mês (tabela do site)",
    pix: 0,
    debito: 0.0099 as number | null,
    credito: [
      0.0329, 0.0449, 0.0499, 0.0549, 0.0599, 0.0659, 0.0749, 0.0849, 0.0899,
      0.0879, 0.0949, 0.1049,
    ],
  },
  acima50k: {
    rotulo: "Acima de R$ 50 mil/mês (tabela do site)",
    pix: 0,
    debito: 0.0099 as number | null,
    credito: [
      0.0319, 0.0399, 0.0459, 0.0519, 0.0559, 0.0649, 0.0699, 0.0749, 0.0789,
      0.0849, 0.0899, 0.0999,
    ],
  },
} as const;

type Faixa = keyof typeof TAXAS;
type Forma = "pix" | "debito" | "credito";

// Simples Nacional — Anexo III (serviço de reparação e manutenção).
const ANEXO_III = [
  { teto: 180000, nominal: 0.06, deducao: 0, iss: 0.335 },
  { teto: 360000, nominal: 0.112, deducao: 9360, iss: 0.32 },
  { teto: 720000, nominal: 0.135, deducao: 17640, iss: 0.325 },
  { teto: 1800000, nominal: 0.16, deducao: 35640, iss: 0.325 },
  { teto: 3600000, nominal: 0.21, deducao: 125640, iss: 0.335 },
  { teto: 4800000, nominal: 0.33, deducao: 648000, iss: 0 },
];

/**
 * Carga tributária total e sua repartição.
 *
 * A SI recolhe em duas guias: o DAS sai sem ISS (retenção/substituição) e o
 * ISS vai à parte pela Nota Carioca. A soma continua sendo a alíquota cheia
 * do Anexo III — por isso o gross-up usa `total`, nunca só uma das partes.
 *
 * Conferido no PGDAS-D de 05/2026: DAS 3,99% + ISS 2,01% = 6,00%.
 */
function simples(rbt12: number) {
  const f =
    !rbt12 || rbt12 <= 0
      ? ANEXO_III[0]
      : ANEXO_III.find((x) => rbt12 <= x.teto) || ANEXO_III[ANEXO_III.length - 1];

  const total =
    !rbt12 || rbt12 <= 0 ? f.nominal : (rbt12 * f.nominal - f.deducao) / rbt12;

  const iss = total * f.iss;
  return { total, das: total - iss, iss };
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => (v * 100).toFixed(2).replace(".", ",") + "%";

function n(v: string) {
  const x = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(x) && x > 0 ? x : 0;
}

const fmt = (v: number) => (Number.isFinite(v) ? brl(v) : "—");

export default function CalculadoraPrecificacao() {
  const [material, setMaterial] = useState("670");
  const [maoDeObra, setMaoDeObra] = useState("180");
  const [custosFixos, setCustosFixos] = useState("50");
  const [markup, setMarkup] = useState(0.3);
  const [garantiaPct, setGarantiaPct] = useState(0.04);
  const [faixa, setFaixa] = useState<Faixa>("contaSI");
  const [rbt12, setRbt12] = useState("");
  const [forma, setForma] = useState<Forma>("pix");
  const [parcelas, setParcelas] = useState(1);

  const calc = useMemo(() => {
    const mat = n(material);
    const mo = n(maoDeObra);
    const fixos = n(custosFixos);
    const imposto = simples(n(rbt12));

    const garantia = mat * garantiaPct;
    const lucro = (mat + mo) * markup;
    const liquido = mat + mo + fixos + garantia + lucro;

    const t = TAXAS[faixa];

    const taxaDe = (f: Forma, p: number) => {
      if (f === "pix") return t.pix;
      if (f === "debito") return t.debito ?? 0;
      return t.credito[p - 1];
    };

    const preco = (f: Forma, p: number) => {
      const divisor = 1 - imposto.total - taxaDe(f, p);
      return divisor > 0 ? liquido / divisor : NaN;
    };

    const linhas = [
      { id: "pix", rotulo: "Pix", forma: "pix" as Forma, parcelas: 1 },
      ...(t.debito !== null
        ? [{ id: "debito", rotulo: "Débito", forma: "debito" as Forma, parcelas: 1 }]
        : []),
      ...Array.from({ length: t.credito.length }, (_, i) => ({
        id: `credito${i + 1}`,
        rotulo: `Crédito ${i + 1}x`,
        forma: "credito" as Forma,
        parcelas: i + 1,
      })),
    ].map((l) => {
      const p = preco(l.forma, l.parcelas);
      return {
        ...l,
        preco: p,
        parcela: l.forma === "credito" ? p / l.parcelas : null,
        taxa: taxaDe(l.forma, l.parcelas),
      };
    });

    const precoPix = linhas[0].preco;
    const sel =
      linhas.find(
        (l) => l.forma === forma && (forma !== "credito" || l.parcelas === parcelas)
      ) || linhas[0];

    const valorTaxa = sel.preco * sel.taxa;
    const valorDas = sel.preco * imposto.das;
    const valorIss = sel.preco * imposto.iss;
    const valorImposto = valorDas + valorIss;
    const custoTotal = mat + mo + fixos;
    const lucroReal = sel.preco - valorImposto - valorTaxa - custoTotal - garantia;

    return {
      mat,
      mo,
      fixos,
      garantia,
      lucro,
      imposto,
      linhas,
      sel,
      precoPix,
      valorTaxa,
      valorDas,
      valorIss,
      valorImposto,
      custoTotal,
      lucroReal,
      margem: sel.preco > 0 ? lucroReal / sel.preco : 0,
      desconto: sel.preco - precoPix,
    };
  }, [material, maoDeObra, custosFixos, markup, garantiaPct, faixa, rbt12, forma, parcelas]);

  const campo =
    "w-full rounded-lg border border-theme bg-theme-card px-3 py-2.5 text-lg text-theme tabular-nums outline-none focus:border-primary";
  const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-theme-muted";

  const chip = (ativo: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
      ativo
        ? "border-primary bg-primary text-white"
        : "border-theme text-theme-muted hover:opacity-80"
    }`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-theme bg-theme-card p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Peça (custo)</label>
            <input
              className={campo}
              inputMode="decimal"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Mão de obra</label>
            <input
              className={campo}
              inputMode="decimal"
              value={maoDeObra}
              onChange={(e) => setMaoDeObra(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Deslocamento</label>
            <input
              className={campo}
              inputMode="decimal"
              value={custosFixos}
              onChange={(e) => setCustosFixos(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Markup</label>
            <div className="flex gap-2">
              {[0.3, 0.4, 0.5].map((m) => (
                <button key={m} onClick={() => setMarkup(m)} className={chip(markup === m)}>
                  {m * 100}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>Provisão de garantia</label>
            <div className="flex gap-2">
              {[0, 0.04, 0.08].map((g) => (
                <button key={g} onClick={() => setGarantiaPct(g)} className={chip(garantiaPct === g)}>
                  {g === 0 ? "Nenhuma" : `${g * 100}%`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-theme bg-theme-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Faturamento mensal (faixa SumUp)</label>
            <select
              className={campo}
              value={faixa}
              onChange={(e) => {
                const nova = e.target.value as Faixa;
                setFaixa(nova);
                const max = TAXAS[nova].credito.length;
                if (parcelas > max) setParcelas(1);
              }}
            >
              {Object.entries(TAXAS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>RBT12 — receita dos últimos 12 meses</label>
            <input
              className={campo}
              inputMode="decimal"
              placeholder="Em branco = 1ª faixa (6%)"
              value={rbt12}
              onChange={(e) => setRbt12(e.target.value)}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-theme-muted">
          Carga total de {pct(calc.imposto.total)} em duas guias: DAS a {pct(calc.imposto.das)}{" "}
          (sem ISS, por retenção) e ISS a {pct(calc.imposto.iss)} na Nota Carioca. As duas já
          estão no preço — não some nada por fora.
        </p>
        {faixa !== "contaSI" && (
          <p className="mt-1 text-xs text-amber-600">
            Faixa de simulação (tabela do site) — as taxas reais da conta da SI estão em
            &quot;Conta SI&quot;.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-theme bg-theme-card p-5">
        <div className="mb-4 border-b border-dashed border-theme pb-4">
          <p className="text-xs uppercase tracking-wider text-theme-muted">
            Cobrar no {calc.sel.rotulo.toLowerCase()}
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-theme">
            {fmt(calc.sel.preco)}
          </p>
          {calc.sel.parcela && (
            <p className="mt-1 text-sm text-theme-muted tabular-nums">
              {calc.sel.parcelas}× de {fmt(calc.sel.parcela)}
            </p>
          )}
          {Number.isFinite(calc.sel.preco) && calc.desconto > 0.005 && (
            <p className="mt-2 text-sm text-emerald-600 tabular-nums">
              No Pix: {fmt(calc.precoPix)} — pode dar {fmt(calc.desconto)} de desconto sem
              perder margem.
            </p>
          )}
        </div>

        <dl className="space-y-2 text-sm tabular-nums">
          <Linha rotulo="Peça" valor={-calc.mat} />
          <Linha rotulo="Mão de obra" valor={-calc.mo} />
          <Linha rotulo="Deslocamento" valor={-calc.fixos} />
          {calc.garantia > 0 && (
            <Linha rotulo={`Garantia (${pct(garantiaPct)} da peça)`} valor={-calc.garantia} />
          )}
          <Linha rotulo={`DAS (${pct(calc.imposto.das)})`} valor={-calc.valorDas} />
          <Linha rotulo={`ISS Nota Carioca (${pct(calc.imposto.iss)})`} valor={-calc.valorIss} />
          <Linha rotulo={`Taxa SumUp (${pct(calc.sel.taxa)})`} valor={-calc.valorTaxa} />
        </dl>

        <div className="mt-4 border-t border-dashed border-theme pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-theme-muted">Sobra para você</span>
            <span className="text-2xl font-semibold tabular-nums text-emerald-600">
              {brl(calc.lucroReal)}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-theme-muted">Margem líquida</span>
            <span
              className={`text-sm font-medium tabular-nums ${
                calc.margem < 0.15 ? "text-amber-600" : "text-theme"
              }`}
            >
              {pct(calc.margem)}
            </span>
          </div>
          {calc.margem < 0.15 && calc.sel.preco > 0 && (
            <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
              Margem abaixo de 15%. Um retrabalho aqui zera o serviço — suba o markup ou reduza
              o parcelamento.
            </p>
          )}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-theme-muted">
          Imposto total de {brl(calc.valorImposto)} ({pct(calc.imposto.total)}), pago em duas
          guias.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-theme">
        <div className="max-h-[22rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme bg-theme-card text-left text-xs uppercase tracking-wider text-theme-muted">
                <th className="px-4 py-3 font-medium">Forma</th>
                <th className="px-4 py-3 text-right font-medium">Cobrar</th>
                <th className="px-4 py-3 text-right font-medium">Parcela</th>
                <th className="px-4 py-3 text-right font-medium">Desconto no Pix</th>
              </tr>
            </thead>
            <tbody>
              {calc.linhas.map((l) => {
                const ativo =
                  l.forma === forma && (forma !== "credito" || l.parcelas === parcelas);
                return (
                  <tr
                    key={l.id}
                    onClick={() => {
                      setForma(l.forma);
                      setParcelas(l.parcelas);
                    }}
                    className={`cursor-pointer border-b border-theme/60 last:border-0 tabular-nums transition-colors ${
                      ativo ? "bg-primary/10" : "hover:bg-primary/5"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className={ativo ? "font-semibold text-primary" : "text-theme"}>
                        {l.rotulo}
                      </span>
                      <span className="ml-2 text-xs text-theme-muted">{pct(l.taxa)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-theme">{fmt(l.preco)}</td>
                    <td className="px-4 py-2.5 text-right text-theme-muted">
                      {l.parcela ? fmt(l.parcela) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">
                      {l.preco - calc.precoPix > 0.005 ? "−" + fmt(l.preco - calc.precoPix) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-theme-muted">{rotulo}</dt>
      <dd className="text-theme">{brl(valor)}</dd>
    </div>
  );
}
