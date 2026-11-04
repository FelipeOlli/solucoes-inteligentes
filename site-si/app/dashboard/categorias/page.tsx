"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Categoria = { id: string; nome: string };

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  function normaliseList(raw: unknown): Categoria[] {
    if (Array.isArray(raw)) return raw as Categoria[];
    if (raw && typeof raw === "object" && Array.isArray((raw as { categorias?: unknown }).categorias)) {
      return (raw as { categorias: Categoria[] }).categorias;
    }
    return [];
  }

  function load() {
    setLoadError("");
    api<Categoria[]>("/categorias").then(({ data, status }) => {
      if (status === 200) {
        setCategorias(normaliseList(data));
      } else {
        setLoadError(`Não foi possível carregar as categorias (${status}). Tente recarregar a página.`);
      }
    }).catch(() => {
      setLoadError("Erro de conexão ao carregar categorias. Verifique se o servidor está rodando.");
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome) return;
    setError("");
    const { data, status } = await api<Categoria>("/categorias", {
      method: "POST",
      body: { nome },
    });
    if (status === 401) return;
    if (status === 201 && data) {
      setNovoNome("");
      load();
    } else {
      setError("Não foi possível criar. Nome já existe?");
    }
  }

  async function handleSalvarEdicao(id: string) {
    const nome = editNome.trim();
    if (!nome) return;
    setError("");
    const { data, status } = await api<Categoria>(`/categorias/${id}`, {
      method: "PATCH",
      body: { nome },
    });
    if (status === 401) return;
    if (status === 200 && data) {
      setEditId(null);
      setEditNome("");
      load();
    } else {
      setError("Não foi possível atualizar. Nome já existe?");
    }
  }

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Excluir a categoria "${nome}"? Serviços vinculados podem ficar sem categoria.`)) return;
    setError("");
    const { status } = await api(`/categorias/${id}`, { method: "DELETE" });
    if (status === 401) return;
    if (status === 200) {
      if (editId === id) setEditId(null);
      load();
    } else {
      setError("Não foi possível excluir.");
    }
  }

  if (loading) return <p className="">Carregando…</p>;

  const categoriasFiltradas = categorias.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Categorias de serviço"
        description="Tipos de serviço disponíveis para classificar os atendimentos."
      />

      <Card className="mb-6 max-w-md">
        <CardHeader>
          <CardTitle>Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCriar} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome da categoria"
            />
            <Button type="submit" disabled={!novoNome.trim()} className="w-full sm:w-auto">
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {loadError && <p className="mb-4 text-red-600">{loadError} <button type="button" onClick={() => { setLoading(true); load(); }} className="ml-1 underline">Recarregar</button></p>}

      <div className="mb-4 max-w-md">
        <Input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar categoria…"
        />
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <Table>
          <TableHeader className="bg-surface-subtle">
            <TableRow className="hover:bg-surface-subtle">
              <TableHead>Nome</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoriasFiltradas.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={2} className="py-6 text-center text-ink-muted">
                  {busca ? "Nenhuma categoria encontrada." : "Nenhuma categoria cadastrada."}
                </TableCell>
              </TableRow>
            ) : (
              categoriasFiltradas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {editId === c.id ? (
                      <Input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSalvarEdicao(c.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                      />
                    ) : (
                      <span>{c.nome}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editId === c.id ? (
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSalvarEdicao(c.id)}>
                          Salvar
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => { setEditId(c.id); setEditNome(c.nome); }}>
                          Editar
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleExcluir(c.id, c.nome)} className="text-red-600 hover:bg-red-600/10 hover:text-red-600">
                          Excluir
                        </Button>
                      </div>
                    )}
                  </TableCell>
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
