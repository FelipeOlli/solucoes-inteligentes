"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, withBasePath } from "@/lib/api";

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
  const [valorMaterial, setValorMaterial] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [imagens, setImagens] = useState<File[]>([]);
  const [orcamentoFiles, setOrcamentoFiles] = useState<File[]>([]);
  const [draggingImagens, setDraggingImagens] = useState(false);
  const [draggingOrcamento, setDraggingOrcamento] = useState(false);
  const [showModalConvidado, setShowModalConvidado] = useState(false);
  const [convidadoTipo, setConvidadoTipo] = useState<"sem" | "tecnico" | "outro">("sem");
  const [convidadoTecnicoEmail, setConvidadoTecnicoEmail] = useState("");
  const [convidadoOutroEmail, setConvidadoOutroEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const valorFromQuery = searchParams.get("valor");

  useEffect(() => {
    api<Cliente[]>("/clientes").then(({ data, status }) => {
      if (status === 401) router.push("/login");
      setClientes(data || []);
    });
    api<Categoria[]>("/categorias").then(({ data }) => setCategorias(data || []));
    api<Tecnico[]>("/tecnicos").then(({ data }) => setTecnicos(data || []));
  }, [router]);

  useEffect(() => {
    if (!valorFromQuery || valorEstimado.trim() !== "") return;
    const n = Number(valorFromQuery.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    setValorEstimado(
      n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }, [valorFromQuery, valorEstimado]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!usarNovoCliente && !clienteId) {
      setError("Selecione um cliente ou cadastre um novo.");
      return;
    }

    if (dataAgendamento) {
      setConvidadoTipo("sem");
      setConvidadoTecnicoEmail("");
      setConvidadoOutroEmail("");
      setShowModalConvidado(true);
      return;
    }

    await executarCriacao(null);
  }

  const tecnicosComEmail = tecnicos.filter((t) => t.email);

  return (
    <div className="text-theme">
      {showModalConvidado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-theme-card rounded-lg border border-theme p-6 w-full max-w-md shadow-xl">
            <h2 className="font-heading font-bold text-theme-primary text-lg mb-1">Convidado para o agendamento</h2>
            <p className="text-sm text-theme-muted mb-4">Haverá algum convidado neste agendamento? O convidado receberá um convite pelo Google Calendar.</p>

            <div className="space-y-3 mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="convidado" value="sem" checked={convidadoTipo === "sem"} onChange={() => setConvidadoTipo("sem")} />
                <span className="text-sm">Sem convidado</span>
              </label>

              {tecnicosComEmail.length > 0 && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="convidado" value="tecnico" checked={convidadoTipo === "tecnico"} onChange={() => setConvidadoTipo("tecnico")} className="mt-1" />
                  <div className="flex-1">
                    <span className="text-sm">Técnico cadastrado</span>
                    {convidadoTipo === "tecnico" && (
                      <select
                        value={convidadoTecnicoEmail}
                        onChange={(e) => setConvidadoTecnicoEmail(e.target.value)}
                        className="mt-2 w-full px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm"
                        autoFocus
                      >
                        <option value="">Selecionar técnico…</option>
                        {tecnicosComEmail.map((t) => (
                          <option key={t.id} value={t.email!}>{t.nome} ({t.email})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="convidado" value="outro" checked={convidadoTipo === "outro"} onChange={() => setConvidadoTipo("outro")} className="mt-1" />
                <div className="flex-1">
                  <span className="text-sm">Outro email</span>
                  {convidadoTipo === "outro" && (
                    <input
                      type="email"
                      value={convidadoOutroEmail}
                      onChange={(e) => setConvidadoOutroEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="mt-2 w-full px-3 py-2 border rounded-lg bg-theme-card border-theme text-theme text-sm"
                      autoFocus
                    />
                  )}
                </div>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowModalConvidado(false)}
                className="px-4 py-2 border border-theme rounded-lg text-sm text-theme-muted hover:opacity-80"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarConvidado}
                disabled={loading || (convidadoTipo === "tecnico" && !convidadoTecnicoEmail) || (convidadoTipo === "outro" && !convidadoOutroEmail.trim())}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
              >
                {loading ? "Criando…" : "Confirmar e criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-6">Novo serviço</h1>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Cliente</label>
          <label className="inline-flex items-center gap-2 mr-4 text-theme">
            <input type="radio" checked={!usarNovoCliente} onChange={() => setUsarNovoCliente(false)} />
            Cliente existente
          </label>
          <label className="inline-flex items-center gap-2 text-theme">
            <input type="radio" checked={usarNovoCliente} onChange={() => setUsarNovoCliente(true)} />
            Cadastrar novo
          </label>
        </div>
        {!usarNovoCliente ? (
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            required={!usarNovoCliente}
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} – {c.email}</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 bg-theme-card border border-theme rounded-lg">
            <input
              placeholder="Cliente (razão social ou nome)"
              required
              value={novoCliente.nome}
              onChange={(e) => setNovoCliente((f) => ({ ...f, nome: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2"
            />
            <input
              placeholder="Nome do Contato (opcional)"
              value={novoCliente.nomeContato}
              onChange={(e) => setNovoCliente((f) => ({ ...f, nomeContato: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2"
            />
            <input
              placeholder="Telefone"
              required
              value={novoCliente.telefone}
              onChange={(e) => setNovoCliente((f) => ({ ...f, telefone: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            />
            <input
              placeholder="E-mail"
              type="email"
              required
              value={novoCliente.email}
              onChange={(e) => setNovoCliente((f) => ({ ...f, email: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            />
            <p className="text-xs font-medium text-theme-muted sm:col-span-2 -mb-1">Endereço (opcional)</p>
            <input
              placeholder="Logradouro"
              value={novoCliente.logradouro}
              onChange={(e) => setNovoCliente((f) => ({ ...f, logradouro: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2"
            />
            <input
              placeholder="Bairro"
              value={novoCliente.bairro}
              onChange={(e) => setNovoCliente((f) => ({ ...f, bairro: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            />
            <input
              placeholder="Cidade"
              value={novoCliente.cidade}
              onChange={(e) => setNovoCliente((f) => ({ ...f, cidade: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            />
            <input
              placeholder="UF"
              value={novoCliente.uf}
              onChange={(e) => setNovoCliente((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme uppercase"
              maxLength={2}
            />
            <input
              placeholder="CEP"
              value={novoCliente.cep}
              onChange={(e) => setNovoCliente((f) => ({ ...f, cep: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
            />
            <textarea
              placeholder="Observação (opcional)"
              value={novoCliente.observacoes}
              onChange={(e) => setNovoCliente((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2 resize-y"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Categoria de serviço</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" required>
            <option value="">Selecione...</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Técnico responsável (opcional)</label>
          <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme">
            <option value="">— Sem técnico —</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Data de agendamento (opcional)</label>
          <input type="datetime-local" value={dataAgendamento} onChange={(e) => setDataAgendamento(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Valor do serviço (R$)</label>
          <input type="text" inputMode="decimal" placeholder="0,00" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Material gasto (R$)</label>
          <input type="text" inputMode="decimal" placeholder="0,00 (peças, insumos, etc.)" value={valorMaterial} onChange={(e) => setValorMaterial(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Forma de pagamento</label>
          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
          >
            <option value="">Selecione...</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="PIX">PIX</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CREDITO">Crédito</option>
            <option value="DEBITO">Débito</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" rows={3} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Fotos ou imagens (opcional)</label>
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
            className={`rounded-lg border border-dashed p-3 transition ${draggingImagens ? "border-primary bg-primary/10" : "border-theme"}`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImagens((prev) => mergeUniqueFiles(prev, e.target.files ? Array.from(e.target.files) : []))}
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-primary file:text-white"
            />
            <p className="text-xs text-theme-muted mt-2">Arraste e solte imagens aqui ou clique em Escolher arquivos.</p>
            {imagens.length > 0 && <p className="text-xs text-theme-muted mt-1">{imagens.length} arquivo(s) selecionado(s).</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Anexar Documentos (opcional)</label>
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
            className={`rounded-lg border border-dashed p-3 transition ${draggingOrcamento ? "border-primary bg-primary/10" : "border-theme"}`}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
              multiple
              onChange={(e) => setOrcamentoFiles((prev) => mergeUniqueFiles(prev, e.target.files ? Array.from(e.target.files) : []))}
              className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-primary file:text-white"
            />
            <p className="text-xs text-theme-muted mt-2">Arraste e solte arquivos aqui ou clique em Escolher arquivos.</p>
            {orcamentoFiles.length > 0 && (
              <p className="text-xs text-theme-muted mt-1">{orcamentoFiles.length} arquivo(s) selecionado(s).</p>
            )}
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
          {loading ? "Criando…" : "Criar serviço"}
        </button>
      </form>
    </div>
  );
}
