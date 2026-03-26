"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

type Cliente = {
  id: string;
  nome: string;
  nomeContato?: string | null;
  email: string;
  telefone: string;
  logradouro?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  observacoes?: string | null;
};

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    api<Cliente[]>(`/clientes${params}`)
      .then(({ data, status }) => {
        if (status === 401) {
          router.push("/login");
          return;
        }
        setClientes(data || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [q]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const { data, error: err, status } = await api<Cliente>("/clientes", {
      method: "POST",
      body: {
        nome: form.nome.trim(),
        nomeContato: form.nomeContato.trim() || undefined,
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        logradouro: form.logradouro.trim() || undefined,
        bairro: form.bairro.trim() || undefined,
        cidade: form.cidade.trim() || undefined,
        uf: form.uf.trim() || undefined,
        cep: form.cep.trim() || undefined,
        observacoes: form.observacoes.trim() || undefined,
      },
    });
    setSaving(false);
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err) {
      setError(err.message);
      return;
    }
    setModal(false);
    setForm({
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
    load();
  }

  return (
    <div className="text-theme">
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-6">Clientes</h1>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <input
          type="search"
          placeholder="Buscar por nome, e-mail, telefone, cidade, CEP..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-4 py-2 border rounded-lg font-body w-full sm:flex-1 sm:max-w-md bg-theme-card border-theme text-theme"
        />
        <button
          type="button"
          onClick={() => setModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 w-full sm:w-auto"
        >
          Novo cliente
        </button>
      </div>
      {loading ? (
        <p className="text-body text-theme-muted">Carregando…</p>
      ) : clientes.length === 0 ? (
        <p className="text-body text-theme-muted">Nenhum cliente encontrado.</p>
      ) : (
        <div className="bg-theme-card border border-theme rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full font-body text-sm text-theme">
            <thead className="border-b border-theme" style={{ backgroundColor: "var(--color-navbar)" }}>
              <tr>
                <th className="text-left p-3 font-heading text-theme-primary">Cliente</th>
                <th className="text-left p-3 font-heading text-theme-primary">Nome do Contato</th>
                <th className="text-left p-3 font-heading text-theme-primary">E-mail</th>
                <th className="text-left p-3 font-heading text-theme-primary">Telefone</th>
                <th className="text-left p-3 font-heading text-theme-primary">Cidade / UF</th>
                <th className="text-left p-3 font-heading text-theme-primary">Observação</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-theme">
                  <td className="p-3">{c.nome}</td>
                  <td className="p-3">{c.nomeContato ?? "—"}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{c.telefone}</td>
                  <td className="p-3 text-theme-muted">
                    {c.cidade || c.uf ? [c.cidade, c.uf].filter(Boolean).join(" / ") : "—"}
                  </td>
                  <td className="p-3 max-w-xs truncate" title={c.observacoes ?? undefined}>{c.observacoes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10 p-4">
          <div className="bg-theme-card border border-theme rounded-lg max-w-lg w-full p-5 sm:p-6 text-theme max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl font-bold text-theme-primary mb-4">Novo cliente</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Cliente</label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                  placeholder="Razão social ou nome da pessoa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Nome do Contato</label>
                <input
                  value={form.nomeContato}
                  onChange={(e) => setForm((f) => ({ ...f, nomeContato: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                  placeholder="Responsável para contato (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Telefone</label>
                <input
                  required
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
              <div className="pt-2 border-t border-theme">
                <p className="text-sm font-medium text-theme-primary mb-3">Endereço (opcional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-theme-muted mb-1">Logradouro</label>
                    <input
                      value={form.logradouro}
                      onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                      placeholder="Rua, número, complemento…"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-muted mb-1">Bairro</label>
                    <input
                      value={form.bairro}
                      onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-muted mb-1">Cidade</label>
                    <input
                      value={form.cidade}
                      onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-muted mb-1">UF</label>
                    <input
                      value={form.uf}
                      onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                      className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme uppercase"
                      maxLength={2}
                      placeholder="SP"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-muted mb-1">CEP</label>
                    <input
                      value={form.cep}
                      onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Observação (opcional)</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme resize-y"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 border border-theme rounded-lg text-theme">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
