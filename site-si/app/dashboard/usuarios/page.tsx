"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div>
      <PageHeader
        title="Usuários"
        description="Contas com acesso ao painel administrativo."
        actions={
          <Button type="button" onClick={openCreateModal} className="w-full sm:w-auto">
            Novo usuário
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Buscar por e-mail..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:max-w-md"
        />
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-ink-muted">Carregando…</p>
      ) : usuarios.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <Table>
            <TableHeader className="bg-surface-subtle">
              <TableRow className="hover:bg-surface-subtle">
                <TableHead>E-mail</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell className="text-ink-muted">
                    {u.createdAt ? new Date(u.createdAt).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    {u.email === OWNER_EMAIL ? (
                      <Badge variant="outline">Protegido</Badge>
                    ) : (
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(u)}>
                          Editar
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(u)} className="text-red-600 hover:bg-red-600/10 hover:text-red-600">
                          Excluir
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal
        open={modal}
        onClose={closeModal}
        title={editId ? "Editar usuário" : "Novo usuário"}
        className="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label className="mb-1">E-mail</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1">{editId ? "Nova senha (opcional)" : "Senha"}</Label>
            <Input
              type="password"
              required={!editId}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-1">Confirmar senha</Label>
            <Input
              type="password"
              required={!editId || form.password.length > 0}
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : editId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

