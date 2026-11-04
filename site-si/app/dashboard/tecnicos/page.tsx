"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  userId: string | null;
};

const EMPTY_FORM = { nome: "", endereco: "", telefone: "", email: "", chavePix: "", banco: "", agencia: "", conta: "" };

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [credencialId, setCredencialId] = useState<string | null>(null);
  const [credencialForm, setCredencialForm] = useState({ email: "", password: "" });

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

  async function handleCriarCredencial(id: string) {
    if (!credencialForm.email.trim() || credencialForm.password.length < 8) return;
    setError("");
    const { status, error: err } = await api(`/tecnicos/${id}/credencial`, { method: "POST", body: credencialForm });
    if (status === 201) {
      setCredencialId(null);
      setCredencialForm({ email: "", password: "" });
      load();
    } else {
      setError(err?.message || "Não foi possível criar a credencial.");
    }
  }

  async function handleRemoverCredencial(id: string, nome: string) {
    if (!confirm(`Remover o login de "${nome}"? O técnico não conseguirá mais acessar pelo celular.`)) return;
    setError("");
    const { status } = await api(`/tecnicos/${id}/credencial`, { method: "DELETE" });
    if (status === 200) load();
    else setError("Não foi possível remover a credencial.");
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
    return <span className="text-ink-muted">—</span>;
  }

  if (loading) return <p className="text-sm text-ink-muted">Carregando…</p>;

  return (
    <div>
      <PageHeader
        title="Técnicos"
        description="Cadastro da equipe, dados bancários e acessos ao portal do técnico."
      />

      <Card className="mb-6 max-w-xl">
        <CardHeader>
          <CardTitle>Novo técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCriar}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Nome *"
                required
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Telefone"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
              <Input
                placeholder="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <Input
                placeholder="Endereço"
                value={form.endereco}
                onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                className="sm:col-span-2"
              />
            </div>

            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Dados bancários (opcional)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Chave PIX"
                value={form.chavePix}
                onChange={(e) => setForm((f) => ({ ...f, chavePix: e.target.value }))}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Banco"
                value={form.banco}
                onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
                className="sm:col-span-2"
              />
              <Input
                placeholder="Agência"
                value={form.agencia}
                onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))}
              />
              <Input
                placeholder="Conta"
                value={form.conta}
                onChange={(e) => setForm((f) => ({ ...f, conta: e.target.value }))}
              />
            </div>

            <Button type="submit" disabled={!form.nome.trim()} className="mt-4">
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <Table className="min-w-[820px]">
          <TableHeader className="bg-surface-subtle">
            <TableRow className="hover:bg-surface-subtle">
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Dados bancários</TableHead>
              <TableHead>Acesso ao app</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tecnicos.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-6 text-center text-ink-muted">
                  Nenhum técnico cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              tecnicos.map((t) => (
                <TableRow key={t.id}>
                  {editId === t.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.nome}
                          onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.telefone}
                          onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            placeholder="Chave PIX"
                            value={editForm.chavePix}
                            onChange={(e) => setEditForm((f) => ({ ...f, chavePix: e.target.value }))}
                          />
                          <Input
                            placeholder="Banco"
                            value={editForm.banco}
                            onChange={(e) => setEditForm((f) => ({ ...f, banco: e.target.value }))}
                          />
                          <div className="flex gap-1">
                            <Input
                              placeholder="Agência"
                              value={editForm.agencia}
                              onChange={(e) => setEditForm((f) => ({ ...f, agencia: e.target.value }))}
                            />
                            <Input
                              placeholder="Conta"
                              value={editForm.conta}
                              onChange={(e) => setEditForm((f) => ({ ...f, conta: e.target.value }))}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-ink-muted">—</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleSalvar(t.id)}>
                            Salvar
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell className="text-ink-muted">{t.telefone ?? "—"}</TableCell>
                      <TableCell className="text-ink-muted">{t.email ?? "—"}</TableCell>
                      <TableCell className="text-sm text-ink-muted">{dadosBancariosLabel(t)}</TableCell>
                      <TableCell className="text-sm">
                        {t.userId ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="accent">Login ativo</Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverCredencial(t.id, t.nome)}
                              className="text-red-600 hover:bg-red-600/10 hover:text-red-600"
                            >
                              Remover
                            </Button>
                          </div>
                        ) : credencialId === t.id ? (
                          <div className="min-w-[220px] space-y-1">
                            <Input
                              type="email"
                              placeholder="E-mail de login"
                              value={credencialForm.email}
                              onChange={(e) => setCredencialForm((f) => ({ ...f, email: e.target.value }))}
                              autoFocus
                            />
                            <Input
                              type="password"
                              placeholder="Senha (mín. 8 caracteres)"
                              value={credencialForm.password}
                              onChange={(e) => setCredencialForm((f) => ({ ...f, password: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => handleCriarCredencial(t.id)}>
                                Criar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => { setCredencialId(null); setCredencialForm({ email: "", password: "" }); }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button type="button" variant="outline" size="sm" onClick={() => setCredencialId(t.id)}>
                            Criar login
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
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
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluir(t.id, t.nome)}
                            className="text-red-600 hover:bg-red-600/10 hover:text-red-600"
                          >
                            Remover
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}
