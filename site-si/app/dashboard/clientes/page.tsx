"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

type Cliente = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  endereco?: string | null;
};

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", endereco: "" });
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
      body: { nome: form.nome.trim(), email: form.email.trim(), telefone: form.telefone.trim(), endereco: form.endereco.trim() || undefined },
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
    setForm({ nome: "", email: "", telefone: "", endereco: "" });
    load();
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary mb-6">Clientes</h1>
      <div className="flex gap-4 mb-6">
        <input
          type="search"
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-4 py-2 border rounded-lg font-body flex-1 max-w-md"
        />
        <button
          type="button"
          onClick={() => setModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90"
        >
          Novo cliente
        </button>
      </div>
      {loading ? (
        <p className="text-body text-gray-600">Carregando…</p>
      ) : clientes.length === 0 ? (
        <p className="text-body text-gray-600">Nenhum cliente encontrado.</p>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full font-body text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">E-mail</th>
                <th className="text-left p-3">Telefone</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.nome}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{c.telefone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="font-heading text-xl font-bold text-primary mb-4">Novo cliente</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  required
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Endereço (opcional)</label>
                <input
                  value={form.endereco}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 border rounded-lg">
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
