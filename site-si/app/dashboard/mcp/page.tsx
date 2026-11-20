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

type Chave = {
  id: string;
  nome: string;
  prefixo: string;
  criadaEm: string;
  ultimoUso: string | null;
  revogadaEm: string | null;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

export default function ChavesMcpPage() {
  const router = useRouter();
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [nome, setNome] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [novaChave, setNovaChave] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function load() {
    api<Chave[]>("/mcp-chaves")
      .then(({ data, status }) => {
        if (status === 401) {
          router.push("/login");
          return;
        }
        setChaves(data || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const { data, error: err, status } = await api<Chave & { chave: string }>("/mcp-chaves", {
      method: "POST",
      body: { nome: nome.trim() },
    });
    setSaving(false);
    if (status === 401) {
      router.push("/login");
      return;
    }
    if (err || !data) {
      setError(err?.message || "Erro ao criar chave.");
      return;
    }
    setModal(false);
    setNome("");
    setCopiado(false);
    setNovaChave(data.chave);
    load();
  }

  async function handleRevogar(c: Chave) {
    if (!window.confirm(`Revogar a chave "${c.nome}"? Quem usa essa chave perde o acesso na hora.`)) return;
    const { error: err, status } = await api<{ ok: true }>(`/mcp-chaves/${c.id}`, { method: "DELETE" });
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

  async function copiar() {
    if (!novaChave) return;
    await navigator.clipboard.writeText(novaChave);
    setCopiado(true);
  }

  return (
    <div>
      <PageHeader
        title="Chaves MCP"
        description="Chaves de acesso ao endpoint /mcp. Use no conector como Authorization: Bearer <chave>."
        actions={
          <Button
            type="button"
            onClick={() => {
              setError("");
              setNome("");
              setModal(true);
            }}
            className="w-full sm:w-auto"
          >
            Nova chave
          </Button>
        }
      />

      {error && !modal && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-ink-muted">Carregando…</p>
      ) : chaves.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma chave criada.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <Table>
            <TableHeader className="bg-surface-subtle">
              <TableRow className="hover:bg-surface-subtle">
                <TableHead>Nome</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chaves.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="font-mono text-ink-muted">{c.prefixo.startsWith("simcp_") ? `${c.prefixo}…` : c.prefixo}</TableCell>
                  <TableCell className="text-ink-muted">{fmt(c.criadaEm)}</TableCell>
                  <TableCell className="text-ink-muted">{fmt(c.ultimoUso)}</TableCell>
                  <TableCell>
                    {c.revogadaEm ? (
                      <Badge variant="outline">Revogada</Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevogar(c)}
                        className="text-red-600 hover:bg-red-600/10 hover:text-red-600"
                      >
                        Revogar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova chave MCP" className="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label className="mb-1">Nome (ex.: claude.ai, notebook)</Label>
            <Input required maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Gerando…" : "Gerar chave"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={novaChave !== null} onClose={() => setNovaChave(null)} title="Chave gerada" className="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Copie agora. Por segurança ela não será exibida novamente.
          </p>
          <code className="block break-all rounded-control border border-line bg-surface-subtle p-3 text-sm">
            {novaChave}
          </code>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setNovaChave(null)}>
              Fechar
            </Button>
            <Button type="button" onClick={copiar}>
              {copiado ? "Copiada!" : "Copiar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
