"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Usuario = {
  id: string;
  email: string;
  createdAt: string;
};

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    const { error: err, status } = await api<Usuario>("/usuarios", {
      method: "POST",
      body: {
        email: form.email.trim().toLowerCase(),
        password: form.password,
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
    setForm({ email: "", password: "", confirm: "" });
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
          onClick={() => setModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 w-full sm:w-auto"
        >
          Novo usuário
        </button>
      </div>
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
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-theme">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    {u.createdAt ? new Date(u.createdAt).toLocaleString("pt-BR") : "—"}
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
            <h2 className="font-heading text-xl font-bold text-theme-primary mb-4">Novo usuário</h2>
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
                <label className="block text-sm font-medium text-theme-muted mb-1">Senha</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-muted mb-1">Confirmar senha</label>
                <input
                  type="password"
                  required
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-theme-card border-theme text-theme"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 border border-theme rounded-lg text-theme">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                >
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

