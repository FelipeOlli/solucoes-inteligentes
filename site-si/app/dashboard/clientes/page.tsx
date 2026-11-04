"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const emptyForm = {
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
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
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

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setModal(true);
  }

  function openEditModal(c: Cliente) {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      nomeContato: c.nomeContato ?? "",
      email: c.email,
      telefone: c.telefone,
      logradouro: c.logradouro ?? "",
      bairro: c.bairro ?? "",
      cidade: c.cidade ?? "",
      uf: c.uf ?? "",
      cep: c.cep ?? "",
      observacoes: c.observacoes ?? "",
    });
    setError("");
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body = {
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
    };
    const { data, error: err, status } = editingId
      ? await api<Cliente>(`/clientes/${editingId}`, { method: "PATCH", body })
      : await api<Cliente>("/clientes", { method: "POST", body });
    setSaving(false);
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      closeModal();
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Cadastro e histórico de contato dos clientes atendidos."
        actions={
          <Button type="button" onClick={openCreateModal} className="w-full sm:w-auto">
            Novo cliente
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          placeholder="Buscar por nome, e-mail, telefone, cidade, CEP..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-md"
        />
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando…</p>
      ) : clientes.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum cliente encontrado.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <Table>
            <TableHeader className="bg-surface-subtle">
              <TableRow className="hover:bg-surface-subtle">
                <TableHead>Cliente</TableHead>
                <TableHead>Nome do Contato</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade / UF</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="w-px text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.nomeContato ?? "—"}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.telefone}</TableCell>
                  <TableCell className="text-ink-muted">
                    {c.cidade || c.uf ? [c.cidade, c.uf].filter(Boolean).join(" / ") : "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={c.observacoes ?? undefined}>
                    {c.observacoes ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(c)}
                    >
                      Editar
                    </Button>
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
        title={editingId ? "Editar cliente" : "Novo cliente"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1">Cliente</Label>
            <Input
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Razão social ou nome da pessoa"
            />
          </div>
          <div>
            <Label className="mb-1">Nome do Contato</Label>
            <Input
              value={form.nomeContato}
              onChange={(e) => setForm((f) => ({ ...f, nomeContato: e.target.value }))}
              placeholder="Responsável para contato (opcional)"
            />
          </div>
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
            <Label className="mb-1">Telefone</Label>
            <Input
              required
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            />
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm font-medium text-ink">Endereço (opcional)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-1">Logradouro</Label>
                <Input
                  value={form.logradouro}
                  onChange={(e) => setForm((f) => ({ ...f, logradouro: e.target.value }))}
                  placeholder="Rua, número, complemento…"
                />
              </div>
              <div>
                <Label className="mb-1">Bairro</Label>
                <Input
                  value={form.bairro}
                  onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1">Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1">UF</Label>
                <Input
                  value={form.uf}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                  className="uppercase"
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
              <div>
                <Label className="mb-1">CEP</Label>
                <Input
                  value={form.cep}
                  onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="mb-1">Observação (opcional)</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : editingId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
