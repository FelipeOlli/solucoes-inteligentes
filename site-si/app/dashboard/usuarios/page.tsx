"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Usuario = {
  id: string;
  email: string;
  createdAt: string;
};

const OWNER_EMAIL = "dono@solucoesinteligentes.com";

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    api<Usuario[]>(`/usuarios${params}`)
      .then(({ data, status }) => {
        if (status === 401) {
          router.push("/login");
          return;
        }
        setUsuarios(data || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [q]);

  function openCreateModal() {
    setEditId(null);
    setForm({ email: "", password: "", confirm: "" });
    setError("");
    setModal(true);
  }

  function openEditModal(usuario: Usuario) {
    if (usuario.email === OWNER_EMAIL) {
      setError("O usuário dono só pode ser alterado diretamente no código.");
      return;
    }
    setEditId(usuario.id);
    setForm({ email: usuario.email, password: "", confirm: "" });
    setError("");
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setEditId(null);
    setForm({ email: "", password: "", confirm: "" });
    setError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const isEditing = editId !== null;

    if (!isEditing || form.password) {
      if (form.password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (form.password !== form.confirm) {
        setError("As senhas não coincidem.");
        return;
      }
    }

    setSaving(true);
    const { error: err, status } = await api<Usuario>(
      isEditing ? `/usuarios/${editId}` : "/usuarios",
      {
        method: isEditing ? "PATCH" : "POST",
        body: {
          email: form.email.trim().toLowerCase(),
          ...(form.password ? { password: form.password } : {}),
        },
      }
    );
    setSaving(false);
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err) {
      setError(err.message);
      return;
    }
    closeModal();
    load();
  }

  async function handleDelete(usuario: Usuario) {
    if (usuario.email === OWNER_EMAIL) {
      setError("O usuário dono não pode ser excluído.");
      return;
    }
    const ok = window.confirm(`Excluir o usuário ${usuario.email}?`);
    if (!ok) return;

    const { error: err, status } = await api<{ ok: true }>(`/usuarios/${usuario.id}`, {
      method: "DELETE",
    });
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  return (
    <div className="text-theme">
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-6">Usuários</h1>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <input
          type="search"
          placeholder="Buscar por e-mail..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-4 py-2 border rounded-lg font-body w-full sm:flex-1 sm:max-w-md bg-theme-card border-theme text-theme"
        />
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 w-full sm:w-auto"
        >
          Novo usuário
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading ? (
        <p className="text-body text-theme-muted">Carregando…</p>
      ) : usuarios.length === 0 ? (
        <p className="text-body text-theme-muted">Nenhum usuário encontrado.</p>
      ) : (
        <div className="bg-theme-card border border-theme rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full font-body text-sm text-theme">
            <thead className="border-b border-theme" style={{ backgroundColor: "var(--color-navbar)" }}>
              <tr>
                <th className="text-left p-3 font-heading text-theme-primary">E-mail</th>
                <th className="text-left p-3 font-heading text-theme-primary">Criado em</th>
                <th className="text-left p-3 font-heading text-theme-primary">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-theme">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    {u.createdAt ? new Date(u.createdAt).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="p-3">
                    {u.email === OWNER_EMAIL ? (
                      <span className="text-xs px-2 py-1 rounded bg-theme-card border border-theme text-theme-muted">
                        Protegido
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="text-sm text-theme-primary underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="text-sm text-red-600 underline"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10 p-4">
          <div className="bg-theme-card border border-theme rounded-lg max-w-md w-full p-5 sm:p-6 text-theme">
            <h2 className="font-heading text-xl font-bold text-theme-primary mb-4">
              {editId ? "Editar usuário" : "Novo usuário"}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
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
                <label className="block text-sm font-medium text-theme-muted mb-1">
                  {editId ? "Nova senha (opcional)" : "Senha"}
                </label>
                <input
                  type="password"
                  required={!editId}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Confirmar senha</label>
                <input
                  type="password"
                  required={!editId || form.password.length > 0}
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-theme rounded-lg text-theme">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? "Salvando…" : editId ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

