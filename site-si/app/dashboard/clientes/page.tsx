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
  endereco?: string | null;
  observacoes?: string | null;
};

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: "", nomeContato: "", email: "", telefone: "", endereco: "", observacoes: "" });
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
      body: { nome: form.nome.trim(), nomeContato: form.nomeContato.trim() || undefined, email: form.email.trim(), telefone: form.telefone.trim(), endereco: form.endereco.trim() || undefined, observacoes: form.observacoes.trim() || undefined },
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
    setForm({ nome: "", nomeContato: "", email: "", telefone: "", endereco: "", observacoes: "" });
    load();
  }

  return (
    <div className="text-theme">
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-6">Clientes</h1>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <input
          type="search"
          placeholder="Buscar por cliente, e-mail ou telefone..."
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
                <th className="text-left p-3 font-heading text-theme-primary">Nome para contato</th>
                <th className="text-left p-3 font-heading text-theme-primary">E-mail</th>
                <th className="text-left p-3 font-heading text-theme-primary">Telefone</th>
                <th className="text-left p-3 font-heading text-theme-primary">Observações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-theme">
                  <td className="p-3">{c.nome}</td>
                  <td className="p-3">{c.nomeContato ?? "—"}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{c.telefone}</td>
                  <td className="p-3 max-w-xs truncate" title={c.observacoes ?? undefined}>{c.observacoes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10 p-4">
          <div className="bg-theme-card border border-theme rounded-lg max-w-md w-full p-5 sm:p-6 text-theme">
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
                <label className="block text-sm font-medium text-theme-muted mb-1">Nome para contato</label>
                <input
                  value={form.nomeContato}
                  onChange={(e) => setForm((f) => ({ ...f, nomeContato: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                  placeholder="Nome da pessoa do telefone (opcional)"
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
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Endereço (opcional)</label>
                <input
                  value={form.endereco}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Observações (opcional)</label>
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
