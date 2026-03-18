"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type Cliente = { id: string; nome: string; email: string; telefone: string };
type Categoria = { id: string; nome: string };

export default function NovoServicoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState({ nome: "", nomeContato: "", email: "", telefone: "", endereco: "", observacoes: "" });
  const [usarNovoCliente, setUsarNovoCliente] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [imagens, setImagens] = useState<File[]>([]);
  const [orcamentoFiles, setOrcamentoFiles] = useState<File[]>([]);
  const [draggingImagens, setDraggingImagens] = useState(false);
  const [draggingOrcamento, setDraggingOrcamento] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const valorFromQuery = searchParams.get("valor");

  useEffect(() => {
    api<Cliente[]>("/clientes").then(({ data, status }) => {
      if (status === 401) router.push("/login");
      setClientes(data || []);
    });
    api<Categoria[]>("/categorias").then(({ data }) => setCategorias(data || []));
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
    await fetch(`/api/servicos/${servicoId}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const body: Record<string, unknown> = {
      categoria_id: categoriaId,
      descricao: descricao.trim(),
      data_agendamento: dataAgendamento || null,
      valor_estimado: valorEstimado ? Number(valorEstimado.trim().replace(",", ".")) || null : null,
      forma_pagamento: formaPagamento || null,
    };
    if (usarNovoCliente) {
      body.cliente = {
        nome: novoCliente.nome.trim(),
        nomeContato: novoCliente.nomeContato.trim() || undefined,
        email: novoCliente.email.trim(),
        telefone: novoCliente.telefone.trim(),
        endereco: novoCliente.endereco.trim() || undefined,
        observacoes: novoCliente.observacoes.trim() || undefined,
      };
    } else {
      if (!clienteId) {
        setError("Selecione um cliente ou cadastre um novo.");
        setLoading(false);
        return;
      }
      body.id_cliente = clienteId;
    }
    const { data, error: err, status } = await api<{ id: string; codigo: string }>("/servicos", {
      method: "POST",
      body,
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

  return (
    <div className="text-theme">
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
            <input
              placeholder="Endereço (opcional)"
              value={novoCliente.endereco}
              onChange={(e) => setNovoCliente((f) => ({ ...f, endereco: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2"
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
          <label className="block text-sm font-medium text-theme-muted mb-1">Data de agendamento (opcional)</label>
          <input type="datetime-local" value={dataAgendamento} onChange={(e) => setDataAgendamento(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-muted mb-1">Valor do serviço (R$)</label>
          <input type="text" inputMode="decimal" placeholder="0,00" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme" />
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
          <label className="block text-sm font-medium text-theme-muted mb-1">Anexar orçamento (opcional)</label>
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
              <p className="text-xs text-theme-muted mt-1">{orcamentoFiles.length} arquivo(s) de orçamento selecionado(s).</p>
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
