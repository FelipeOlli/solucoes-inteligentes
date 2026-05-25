"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Tecnico = {
  id: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  chavePix: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  ativo: boolean;
};

const EMPTY_FORM = { nome: "", endereco: "", telefone: "", email: "", chavePix: "", banco: "", agencia: "", conta: "" };

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  function load() {
    api<Tecnico[]>("/tecnicos").then(({ data }) => {
      setTecnicos(data ?? []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setError("");
    const { status } = await api("/tecnicos", { method: "POST", body: form });
    if (status === 201) {
      setForm(EMPTY_FORM);
      load();
    } else {
      setError("Não foi possível criar o técnico.");
    }
  }

  async function handleSalvar(id: string) {
    if (!editForm.nome.trim()) return;
    setError("");
    const { status } = await api(`/tecnicos/${id}`, { method: "PATCH", body: editForm });
    if (status === 200) {
      setEditId(null);
      load();
    } else {
      setError("Não foi possível salvar.");
    }
  }

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Desativar o técnico "${nome}"? Os serviços vinculados serão mantidos.`)) return;
    setError("");
    const { status } = await api(`/tecnicos/${id}`, { method: "DELETE" });
    if (status === 200) {
      if (editId === id) setEditId(null);
      load();
    } else {
      setError("Não foi possível desativar.");
    }
  }

  function dadosBancariosLabel(t: Tecnico) {
    if (t.chavePix) return <span>PIX: <span className="font-medium">{t.chavePix}</span></span>;
    if (t.banco || t.agencia || t.conta) {
      return (
        <span className="text-xs leading-5">
          {t.banco && <span className="block">{t.banco}</span>}
          {(t.agencia || t.conta) && (
            <span className="block">
              {t.agencia && `Ag. ${t.agencia}`}{t.agencia && t.conta && " / "}{t.conta && `Cc. ${t.conta}`}
            </span>
          )}
        </span>
      );
    }
    return <span className="text-theme-muted">—</span>;
  }

  if (loading) return <p className="text-body">Carregando…</p>;

  return (
    <div>
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-4">Técnicos</h1>

      <form onSubmit={handleCriar} className="bg-theme-card p-4 rounded-lg border border-theme mb-6 max-w-xl">
        <h2 className="font-heading font-bold text-theme-primary mb-3">Novo técnico</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Nome *"
            required
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2"
          />
          <input
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
          />
          <input
            placeholder="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
          />
          <input
            placeholder="Endereço"
            value={form.endereco}
            onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
            className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2"
          />
        </div>

        <p className="text-xs text-theme-muted mt-4 mb-2 font-medium uppercase tracking-wide">Dados bancários (opcional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Chave PIX"
            value={form.chavePix}
            onChange={(e) => setForm((f) => ({ ...f, chavePix: e.target.value }))}
            className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2"
          />
          <input
            placeholder="Banco"
            value={form.banco}
            onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
            className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme sm:col-span-2"
          />
          <input
            placeholder="Agência"
            value={form.agencia}
            onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))}
            className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
          />
          <input
            placeholder="Conta"
            value={form.conta}
            onChange={(e) => setForm((f) => ({ ...f, conta: e.target.value }))}
            className="px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
          />
        </div>

        <button
          type="submit"
          disabled={!form.nome.trim()}
          className="mt-3 px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      <div className="bg-theme-card rounded-lg border border-theme overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-theme min-w-[700px]">
          <thead className="border-b border-theme" style={{ backgroundColor: "var(--color-navbar)" }}>
            <tr>
              <th className="px-4 py-3 font-heading font-bold text-theme-primary">Nome</th>
              <th className="px-4 py-3 font-heading font-bold text-theme-primary">Telefone</th>
              <th className="px-4 py-3 font-heading font-bold text-theme-primary">E-mail</th>
              <th className="px-4 py-3 font-heading font-bold text-theme-primary">Dados bancários</th>
              <th className="px-4 py-3 font-heading font-bold text-theme-primary w-32">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tecnicos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-theme-muted text-center">Nenhum técnico cadastrado.</td>
              </tr>
            ) : (
              tecnicos.map((t) => (
                <tr key={t.id} className="border-b border-theme last:border-b-0">
                  {editId === t.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          value={editForm.nome}
                          onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                          className="w-full px-3 py-1 border rounded bg-theme-card border-theme text-theme"
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={editForm.telefone}
                          onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))}
                          className="w-full px-3 py-1 border rounded bg-theme-card border-theme text-theme"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          className="w-full px-3 py-1 border rounded bg-theme-card border-theme text-theme"
                        />
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        <input
                          placeholder="Chave PIX"
                          value={editForm.chavePix}
                          onChange={(e) => setEditForm((f) => ({ ...f, chavePix: e.target.value }))}
                          className="w-full px-3 py-1 border rounded bg-theme-card border-theme text-theme"
                        />
                        <input
                          placeholder="Banco"
                          value={editForm.banco}
                          onChange={(e) => setEditForm((f) => ({ ...f, banco: e.target.value }))}
                          className="w-full px-3 py-1 border rounded bg-theme-card border-theme text-theme"
                        />
                        <div className="flex gap-1">
                          <input
                            placeholder="Agência"
                            value={editForm.agencia}
                            onChange={(e) => setEditForm((f) => ({ ...f, agencia: e.target.value }))}
                            className="w-1/2 px-3 py-1 border rounded bg-theme-card border-theme text-theme"
                          />
                          <input
                            placeholder="Conta"
                            value={editForm.conta}
                            onChange={(e) => setEditForm((f) => ({ ...f, conta: e.target.value }))}
                            className="w-1/2 px-3 py-1 border rounded bg-theme-card border-theme text-theme"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button type="button" onClick={() => handleSalvar(t.id)} className="text-sm text-theme-primary underline">Salvar</button>
                        <button type="button" onClick={() => setEditId(null)} className="text-sm text-theme-muted underline">Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">{t.nome}</td>
                      <td className="px-4 py-3 text-theme-muted">{t.telefone ?? "—"}</td>
                      <td className="px-4 py-3 text-theme-muted">{t.email ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-theme-muted">{dadosBancariosLabel(t)}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(t.id);
                            setEditForm({
                              nome: t.nome,
                              telefone: t.telefone ?? "",
                              email: t.email ?? "",
                              endereco: t.endereco ?? "",
                              chavePix: t.chavePix ?? "",
                              banco: t.banco ?? "",
                              agencia: t.agencia ?? "",
                              conta: t.conta ?? "",
                            });
                          }}
                          className="text-sm text-theme-primary underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluir(t.id, t.nome)}
                          className="text-sm text-red-600 underline"
                        >
                          Remover
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}
