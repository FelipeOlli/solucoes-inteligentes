"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

type Cliente = { id: string; nome: string; email: string; telefone: string };
type Categoria = { id: string; nome: string };

export default function NovoServicoPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState({ nome: "", email: "", telefone: "", endereco: "" });
  const [usarNovoCliente, setUsarNovoCliente] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [imagens, setImagens] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Cliente[]>("/clientes").then(({ data, status }) => {
      if (status === 401) router.push("/login");
      setClientes(data || []);
    });
    api<Categoria[]>("/categorias").then(({ data }) => setCategorias(data || []));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const body: Record<string, unknown> = {
      categoria_id: categoriaId,
      descricao: descricao.trim(),
      data_agendamento: dataAgendamento || null,
      valor_estimado: valorEstimado ? Number(valorEstimado.trim().replace(",", ".")) || null : null,
    };
    if (usarNovoCliente) {
      body.cliente = {
        nome: novoCliente.nome.trim(),
        email: novoCliente.email.trim(),
        telefone: novoCliente.telefone.trim(),
        endereco: novoCliente.endereco.trim() || undefined,
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
    if (data?.id && imagens.length > 0) {
      const formData = new FormData();
      imagens.forEach((f) => formData.append("file", f));
      const token = typeof window !== "undefined" ? localStorage.getItem("si_token") : null;
      await fetch(`/api/servicos/${data.id}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    }
    setLoading(false);
    if (data?.id) router.push(`/dashboard/servicos/${data.id}`);
  }

  return (
    <div>
      <Link href="/dashboard" className="text-primary underline text-sm mb-4 inline-block">← Voltar</Link>
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-primary mb-6">Novo serviço</h1>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Cliente</label>
          <label className="inline-flex items-center gap-2 mr-4">
            <input type="radio" checked={!usarNovoCliente} onChange={() => setUsarNovoCliente(false)} />
            Cliente existente
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={usarNovoCliente} onChange={() => setUsarNovoCliente(true)} />
            Cadastrar novo
          </label>
        </div>
        {!usarNovoCliente ? (
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required={!usarNovoCliente}
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} – {c.email}</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 bg-gray-50 rounded-lg">
            <input placeholder="Nome" required value={novoCliente.nome} onChange={(e) => setNovoCliente((f) => ({ ...f, nome: e.target.value }))} className="px-4 py-2 border rounded-lg" />
            <input placeholder="E-mail" type="email" required value={novoCliente.email} onChange={(e) => setNovoCliente((f) => ({ ...f, email: e.target.value }))} className="px-4 py-2 border rounded-lg" />
            <input placeholder="Telefone" required value={novoCliente.telefone} onChange={(e) => setNovoCliente((f) => ({ ...f, telefone: e.target.value }))} className="px-4 py-2 border rounded-lg" />
            <input placeholder="Endereço (opcional)" value={novoCliente.endereco} onChange={(e) => setNovoCliente((f) => ({ ...f, endereco: e.target.value }))} className="px-4 py-2 border rounded-lg sm:col-span-2" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Categoria de serviço</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required>
            <option value="">Selecione...</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data de agendamento (opcional)</label>
          <input type="datetime-local" value={dataAgendamento} onChange={(e) => setDataAgendamento(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Valor do serviço (R$)</label>
          <input type="text" inputMode="decimal" placeholder="0,00" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full px-4 py-2 border rounded-lg" rows={3} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Fotos ou imagens (opcional)</label>
          <input type="file" accept="image/*" multiple onChange={(e) => setImagens(e.target.files ? Array.from(e.target.files) : [])} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
          {loading ? "Criando…" : "Criar serviço"}
        </button>
      </form>
    </div>
  );
}
