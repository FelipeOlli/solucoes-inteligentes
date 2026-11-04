"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, withBasePath } from "@/lib/api";
import { brl as fmt, pct } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { MAX_PARCELAS, normalizarParcelas, taxaCartaoPct } from "@/lib/taxas";

type Cliente = { id: string; nome: string; email: string; telefone: string };
type Categoria = { id: string; nome: string };
type Tecnico = { id: string; nome: string; email?: string | null };

export default function NovoServicoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoId, setTecnicoId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    nomeContato: "",
    email: "",
    telefone: "",
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    observacoes: "",
  });
  const [usarNovoCliente, setUsarNovoCliente] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [valorEstimadoTocado, setValorEstimadoTocado] = useState(false);
  const [valorMaterial, setValorMaterial] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [imagens, setImagens] = useState<File[]>([]);
  const [orcamentoFiles, setOrcamentoFiles] = useState<File[]>([]);
  const [draggingImagens, setDraggingImagens] = useState(false);
  const [draggingOrcamento, setDraggingOrcamento] = useState(false);
  const [showModalConvidado, setShowModalConvidado] = useState(false);
  const [showModalOrcamento, setShowModalOrcamento] = useState(false);
  const [orcamentoConfirmado, setOrcamentoConfirmado] = useState(false);
  const [convidadoTipo, setConvidadoTipo] = useState<"sem" | "tecnico" | "outro">("sem");
  const [convidadoTecnicoEmail, setConvidadoTecnicoEmail] = useState("");
  const [convidadoOutroEmail, setConvidadoOutroEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [valorRepasseQuery, setValorRepasseQuery] = useState<number | null>(null);
  const [custoFixoQuery, setCustoFixoQuery] = useState<number | null>(null);
  const [valorGarantiaQuery, setValorGarantiaQuery] = useState<number | null>(null);
  const [impostoPercentualQuery, setImpostoPercentualQuery] = useState<number | null>(null);
  // Parcelas do crédito — a taxa da maquininha é calculada no servidor a
  // partir da forma de pagamento + parcelas (tabela real SumUp).
  const [parcelas, setParcelas] = useState(1);
  // Valores do orçamento: o valor gravado no serviço é sempre o PIX (ver
  // efeito abaixo); o crédito só fica disponível pra exibição informativa no
  // modal de confirmação do orçamento.
  const [valorPixQuery, setValorPixQuery] = useState<number | null>(null);
  const [valorCreditoQuery, setValorCreditoQuery] = useState<number | null>(null);
  const [parcelasCreditoQuery, setParcelasCreditoQuery] = useState<number | null>(null);
  const [lucroPretendidoQuery, setLucroPretendidoQuery] = useState<number | null>(null);
  const materialFromQuery = searchParams.get("material");
  const formaFromQuery = searchParams.get("forma");
  const repasseFromQuery = searchParams.get("repasse");
  const fixoFromQuery = searchParams.get("fixo");
  const garantiaFromQuery = searchParams.get("garantia");
  const impostoFromQuery = searchParams.get("imposto");
  const pixFromQuery = searchParams.get("pix");
  const creditoFromQuery = searchParams.get("credito");
  const parcelasCreditoFromQuery = searchParams.get("parcelasCredito");
  const lucroFromQuery = searchParams.get("lucro");
  // Presença do pix = veio do link "Criar serviço com este orçamento" da
  // calculadora — dispara a exigência de confirmação antes de criar.
  const vieDoOrcamento = pixFromQuery != null;

  useEffect(() => {
    api<Cliente[]>("/clientes").then(({ data, status }) => {
      if (status === 401) router.push("/login");
      setClientes(data || []);
    });
    api<Categoria[]>("/categorias").then(({ data }) => setCategorias(data || []));
    api<Tecnico[]>("/tecnicos").then(({ data }) => setTecnicos(data || []));
  }, [router]);

  useEffect(() => {
    if (!pixFromQuery) return;
    const n = Number(pixFromQuery.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    setValorPixQuery(n);
  }, [pixFromQuery]);

  useEffect(() => {
    if (!creditoFromQuery) return;
    const n = Number(creditoFromQuery.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    setValorCreditoQuery(n);
  }, [creditoFromQuery]);

  useEffect(() => {
    if (!parcelasCreditoFromQuery) return;
    const n = Number(parcelasCreditoFromQuery);
    if (!Number.isFinite(n) || n < 1) return;
    setParcelasCreditoQuery(n);
    setParcelas(normalizarParcelas(n));
  }, [parcelasCreditoFromQuery]);

  // O valor gravado no serviço é sempre o PIX do orçamento — é a base de
  // recebimento, independente da forma de pagamento escolhida no formulário
  // (que é só registro administrativo de como o cliente pagou). Não
  // sobrescreve se o usuário já editou o campo à mão.
  useEffect(() => {
    if (valorPixQuery == null || valorEstimadoTocado) return;
    setValorEstimado(
      valorPixQuery.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }, [valorPixQuery, valorEstimadoTocado]);

  useEffect(() => {
    if (!materialFromQuery || valorMaterial.trim() !== "") return;
    const n = Number(materialFromQuery.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    setValorMaterial(
      n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }, [materialFromQuery, valorMaterial]);

  useEffect(() => {
    if (!formaFromQuery || formaPagamento !== "") return;
    const formasValidas = ["DINHEIRO", "PIX", "CREDITO", "DEBITO", "CHEQUE"];
    if (!formasValidas.includes(formaFromQuery)) return;
    setFormaPagamento(formaFromQuery);
  }, [formaFromQuery, formaPagamento]);

  useEffect(() => {
    if (!repasseFromQuery) return;
    const n = Number(repasseFromQuery.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    setValorRepasseQuery(n);
  }, [repasseFromQuery]);

  useEffect(() => {
    if (!fixoFromQuery) return;
    const n = Number(fixoFromQuery.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    setCustoFixoQuery(n);
  }, [fixoFromQuery]);

  useEffect(() => {
    if (!garantiaFromQuery) return;
    const n = Number(garantiaFromQuery.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    setValorGarantiaQuery(n);
  }, [garantiaFromQuery]);

  useEffect(() => {
    if (!impostoFromQuery) return;
    const n = Number(impostoFromQuery.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    setImpostoPercentualQuery(n);
  }, [impostoFromQuery]);

  useEffect(() => {
    if (!lucroFromQuery) return;
    const n = Number(lucroFromQuery.replace(",", "."));
    if (!Number.isFinite(n)) return;
    setLucroPretendidoQuery(n);
  }, [lucroFromQuery]);

  function mergeUniqueFiles(current: File[], incoming: File[]) {
    const merged = [...current];
    for (const file of incoming) {
      const exists = merged.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      if (!exists) merged.push(file);
    }
    return merged;
  }

  async function uploadFiles(servicoId: string, files: File[]) {
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((f) => formData.append("file", f));
    const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
    await fetch(withBasePath(`/api/servicos/${servicoId}/upload`), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
  }

  function buildPostBody(convidadoEmail: string | null): Record<string, unknown> {
    const body: Record<string, unknown> = {
      categoria_id: categoriaId,
      descricao: descricao.trim(),
      data_agendamento: dataAgendamento ? new Date(dataAgendamento).toISOString() : null,
      valor_estimado: valorEstimado ? Number(valorEstimado.trim().replace(",", ".")) || null : null,
      valor_material: valorMaterial ? Number(valorMaterial.trim().replace(",", ".")) || null : null,
      valor_repasse: valorRepasseQuery,
      custo_fixo: custoFixoQuery,
      valor_garantia: valorGarantiaQuery,
      imposto_percentual: impostoPercentualQuery,
      parcelas: formaPagamento === "CREDITO" ? parcelas : null,
      lucro_pretendido: lucroPretendidoQuery,
      forma_pagamento: formaPagamento || null,
      tecnico_id: tecnicoId || null,
      convidado_email: convidadoEmail,
    };
    if (usarNovoCliente) {
      body.cliente = {
        nome: novoCliente.nome.trim(),
        nomeContato: novoCliente.nomeContato.trim() || undefined,
        email: novoCliente.email.trim(),
        telefone: novoCliente.telefone.trim(),
        logradouro: novoCliente.logradouro.trim() || undefined,
        bairro: novoCliente.bairro.trim() || undefined,
        cidade: novoCliente.cidade.trim() || undefined,
        uf: novoCliente.uf.trim() || undefined,
        cep: novoCliente.cep.trim() || undefined,
        observacoes: novoCliente.observacoes.trim() || undefined,
      };
    } else {
      body.id_cliente = clienteId;
    }
    return body;
  }

  async function executarCriacao(convidadoEmail: string | null) {
    setLoading(true);
    const { data, error: err, status } = await api<{ id: string; codigo: string }>("/servicos", {
      method: "POST",
      body: buildPostBody(convidadoEmail),
    });
    if (status === 401) {
      router.push("/login");
      setLoading(false);
      return;
    }
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (data?.id) {
      await uploadFiles(data.id, imagens);
      await uploadFiles(data.id, orcamentoFiles);
    }
    setLoading(false);
    if (data?.id) router.push(`/dashboard/servicos/${data.id}`);
  }

  async function handleConfirmarConvidado() {
    let email: string | null = null;
    if (convidadoTipo === "tecnico") email = convidadoTecnicoEmail || null;
    else if (convidadoTipo === "outro") email = convidadoOutroEmail.trim() || null;
    setShowModalConvidado(false);
    await executarCriacao(email);
  }

  function prosseguirAposConfirmacoes() {
    if (dataAgendamento) {
      setConvidadoTipo("sem");
      setConvidadoTecnicoEmail("");
      setConvidadoOutroEmail("");
      setShowModalConvidado(true);
      return;
    }
    executarCriacao(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!usarNovoCliente && !clienteId) {
      setError("Selecione um cliente ou cadastre um novo.");
      return;
    }

    // Serviço veio do orçamento: os valores de repasse, deslocamento,
    // garantia, imposto e lucro pretendido chegaram ocultos pela query
    // string — exige uma conferência explícita antes de gravar.
    if (vieDoOrcamento && !orcamentoConfirmado) {
      setShowModalOrcamento(true);
      return;
    }

    prosseguirAposConfirmacoes();
  }

  const tecnicosComEmail = tecnicos.filter((t) => t.email);

  return (
    <div className="text-ink">
      {showModalOrcamento && (
        <Modal
          open={showModalOrcamento}
          onClose={() => setShowModalOrcamento(false)}
          title="Confirme os valores do orçamento"
          description="Estes valores vieram da calculadora e não aparecem no formulário. Confira antes de criar o serviço."
          className="max-w-md"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setShowModalOrcamento(false)}>
                Revisar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setOrcamentoConfirmado(true);
                  setShowModalOrcamento(false);
                  prosseguirAposConfirmacoes();
                }}
              >
                Confirmar e continuar
              </Button>
            </>
          }
        >
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-ink-muted">Valor cobrado (PIX)</span><span className="font-medium">{valorPixQuery != null ? fmt(valorPixQuery) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Material</span><span className="font-medium">{valorMaterial ? fmt(Number(valorMaterial.replace(",", "."))) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Repasse (mão de obra)</span><span className="font-medium">{valorRepasseQuery != null ? fmt(valorRepasseQuery) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Deslocamento</span><span className="font-medium">{custoFixoQuery != null ? fmt(custoFixoQuery) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Garantia</span><span className="font-medium">{valorGarantiaQuery != null ? fmt(valorGarantiaQuery) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Imposto</span><span className="font-medium">{impostoPercentualQuery != null ? `${impostoPercentualQuery.toFixed(2).replace(".", ",")}%` : "—"}</span></div>
            <div className="mt-1.5 flex justify-between border-t border-line pt-1.5"><span className="text-ink-muted">Lucro pretendido</span><span className="font-semibold">{lucroPretendidoQuery != null ? fmt(lucroPretendidoQuery) : "—"}</span></div>
            {valorCreditoQuery != null && parcelasCreditoQuery != null && (
              <p className="pt-1 text-xs text-ink-muted">
                Se pago no crédito {parcelasCreditoQuery}x: {fmt(valorCreditoQuery)}. O valor gravado no serviço continua sendo o PIX.
              </p>
            )}
          </div>
        </Modal>
      )}

      {showModalConvidado && (
        <Modal
          open={showModalConvidado}
          onClose={() => setShowModalConvidado(false)}
          title="Convidado para o agendamento"
          description="Haverá algum convidado neste agendamento? O convidado receberá um convite pelo Google Calendar."
          className="max-w-md"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setShowModalConvidado(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmarConvidado}
                disabled={loading || (convidadoTipo === "tecnico" && !convidadoTecnicoEmail) || (convidadoTipo === "outro" && !convidadoOutroEmail.trim())}
              >
                {loading ? "Criando…" : "Confirmar e criar"}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="convidado" value="sem" checked={convidadoTipo === "sem"} onChange={() => setConvidadoTipo("sem")} />
              <span className="text-sm">Sem convidado</span>
            </label>

            {tecnicosComEmail.length > 0 && (
              <label className="flex cursor-pointer items-start gap-2">
                <input type="radio" name="convidado" value="tecnico" checked={convidadoTipo === "tecnico"} onChange={() => setConvidadoTipo("tecnico")} className="mt-1" />
                <div className="flex-1">
                  <span className="text-sm">Técnico cadastrado</span>
                  {convidadoTipo === "tecnico" && (
                    <Select
                      value={convidadoTecnicoEmail}
                      onChange={(e) => setConvidadoTecnicoEmail(e.target.value)}
                      className="mt-2"
                      autoFocus
                    >
                      <option value="">Selecionar técnico…</option>
                      {tecnicosComEmail.map((t) => (
                        <option key={t.id} value={t.email!}>{t.nome} ({t.email})</option>
                      ))}
                    </Select>
                  )}
                </div>
              </label>
            )}

            <label className="flex cursor-pointer items-start gap-2">
              <input type="radio" name="convidado" value="outro" checked={convidadoTipo === "outro"} onChange={() => setConvidadoTipo("outro")} className="mt-1" />
              <div className="flex-1">
                <span className="text-sm">Outro email</span>
                {convidadoTipo === "outro" && (
                  <Input
                    type="email"
                    value={convidadoOutroEmail}
                    onChange={(e) => setConvidadoOutroEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="mt-2"
                    autoFocus
                  />
                )}
              </div>
            </label>
          </div>
        </Modal>
      )}

      <PageHeader
        title="Novo serviço"
        description="Cadastre o atendimento, defina o valor e agende a visita."
      />
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <Label className="mb-1">Cliente</Label>
          <label className="mr-4 inline-flex items-center gap-2 whitespace-nowrap text-ink">
            <Input type="radio" checked={!usarNovoCliente} onChange={() => setUsarNovoCliente(false)} />
            Cliente existente
          </label>
          <label className="inline-flex items-center gap-2 whitespace-nowrap text-ink">
            <Input type="radio" checked={usarNovoCliente} onChange={() => setUsarNovoCliente(true)} />
            Cadastrar novo
          </label>
        </div>
        {!usarNovoCliente ? (
          <Select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            
            required={!usarNovoCliente}
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} – {c.email}</option>
            ))}
          </Select>
        ) : (
          <div className="bg-surface border border-line grid grid-cols-1 gap-3 rounded-card p-4 sm:grid-cols-2 sm:gap-4">
            <Input
              placeholder="Cliente (razão social ou nome)"
              required
              value={novoCliente.nome}
              onChange={(e) => setNovoCliente((f) => ({ ...f, nome: e.target.value }))}
              className="sm:col-span-2"
            />
            <Input
              placeholder="Nome do Contato (opcional)"
              value={novoCliente.nomeContato}
              onChange={(e) => setNovoCliente((f) => ({ ...f, nomeContato: e.target.value }))}
              className="sm:col-span-2"
            />
            <Input
              placeholder="Telefone"
              required
              value={novoCliente.telefone}
              onChange={(e) => setNovoCliente((f) => ({ ...f, telefone: e.target.value }))}
              
            />
            <Input
              placeholder="E-mail"
              type="email"
              required
              value={novoCliente.email}
              onChange={(e) => setNovoCliente((f) => ({ ...f, email: e.target.value }))}
              
            />
            <p className="-mb-1 text-xs font-medium text-ink-muted sm:col-span-2">Endereço (opcional)</p>
            <Input
              placeholder="Logradouro"
              value={novoCliente.logradouro}
              onChange={(e) => setNovoCliente((f) => ({ ...f, logradouro: e.target.value }))}
              className="sm:col-span-2"
            />
            <Input
              placeholder="Bairro"
              value={novoCliente.bairro}
              onChange={(e) => setNovoCliente((f) => ({ ...f, bairro: e.target.value }))}
              
            />
            <Input
              placeholder="Cidade"
              value={novoCliente.cidade}
              onChange={(e) => setNovoCliente((f) => ({ ...f, cidade: e.target.value }))}
              
            />
            <Input
              placeholder="UF"
              value={novoCliente.uf}
              onChange={(e) => setNovoCliente((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
              className="uppercase"
              maxLength={2}
            />
            <Input
              placeholder="CEP"
              value={novoCliente.cep}
              onChange={(e) => setNovoCliente((f) => ({ ...f, cep: e.target.value }))}
              
            />
            <Textarea
              placeholder="Observação (opcional)"
              value={novoCliente.observacoes}
              onChange={(e) => setNovoCliente((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
              className="sm:col-span-2 resize-y"
            />
          </div>
        )}
        <div>
          <Label className="mb-1">Categoria de serviço</Label>
          <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}  required>
            <option value="">Selecione...</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="mb-1">Técnico responsável (opcional)</Label>
          <Select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} >
            <option value="">— Sem técnico —</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="mb-1">Data de agendamento (opcional)</Label>
          <Input type="datetime-local" value={dataAgendamento} onChange={(e) => setDataAgendamento(e.target.value)}  />
        </div>
        <div>
          <Label className="mb-1">Valor do serviço (R$)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={valorEstimado}
            onChange={(e) => {
              setValorEstimadoTocado(true);
              setValorEstimado(e.target.value);
            }}
            
          />
        </div>
        <div>
          <Label className="mb-1">Material gasto (R$)</Label>
          <Input type="text" inputMode="decimal" placeholder="0,00 (peças, insumos, etc.)" value={valorMaterial} onChange={(e) => setValorMaterial(e.target.value)}  />
        </div>
        <div>
          <Label className="mb-1">Forma de pagamento</Label>
          <Select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
            
          >
            <option value="">Selecione...</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">PIX</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CREDITO">Crédito</option>
            <option value="DEBITO">Débito</option>
          </Select>
        </div>
        {formaPagamento === "CREDITO" && (
          <div>
            <label className="block text-sm font-medium text-theme-muted mb-1">Parcelas no crédito</label>
            <select
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            >
              {Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>
                  {p}x — taxa {pct(taxaCartaoPct("CREDITO", p))}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <Label className="mb-1">Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}  rows={3} required />
        </div>
        <div>
          <Label className="mb-1">Fotos ou imagens (opcional)</Label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingImagens(true);
            }}
            onDragLeave={() => setDraggingImagens(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDraggingImagens(false);
              const dropped = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
              if (!dropped.length) return;
              setImagens((prev) => mergeUniqueFiles(prev, dropped));
            }}
            className={`rounded-control border border-dashed p-3 transition ${draggingImagens ? "border-brand bg-brand/10" : "border-line"}`}
          >
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImagens((prev) => mergeUniqueFiles(prev, e.target.files ? Array.from(e.target.files) : []))}
              className="file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-brand file:text-brand-fg"
            />
            <p className="text-xs text-ink-muted mt-2">Arraste e solte imagens aqui ou clique em Escolher arquivos.</p>
            {imagens.length > 0 && <p className="text-xs text-ink-muted mt-1">{imagens.length} arquivo(s) selecionado(s).</p>}
          </div>
        </div>
        <div>
          <Label className="mb-1">Anexar Documentos (opcional)</Label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingOrcamento(true);
            }}
            onDragLeave={() => setDraggingOrcamento(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDraggingOrcamento(false);
              const dropped = Array.from(e.dataTransfer.files ?? []);
              if (!dropped.length) return;
              setOrcamentoFiles((prev) => mergeUniqueFiles(prev, dropped));
            }}
            className={`rounded-control border border-dashed p-3 transition ${draggingOrcamento ? "border-brand bg-brand/10" : "border-line"}`}
          >
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
              multiple
              onChange={(e) => setOrcamentoFiles((prev) => mergeUniqueFiles(prev, e.target.files ? Array.from(e.target.files) : []))}
              className="file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-brand file:text-brand-fg"
            />
            <p className="text-xs text-ink-muted mt-2">Arraste e solte arquivos aqui ou clique em Escolher arquivos.</p>
            {orcamentoFiles.length > 0 && (
              <p className="text-xs text-ink-muted mt-1">{orcamentoFiles.length} arquivo(s) selecionado(s).</p>
            )}
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Criando…" : "Criar serviço"}
        </Button>
      </form>
    </div>
  );
}
