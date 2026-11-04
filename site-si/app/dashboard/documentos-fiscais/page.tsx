"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TipoDocumentoFiscal, StatusPagamentoFiscal } from "@prisma/client";
import { api } from "@/lib/api";
import { SidebarTipos } from "@/components/documentos-fiscais/SidebarTipos";
import { KpiCards } from "@/components/documentos-fiscais/KpiCards";
import { BuscaGlobal } from "@/components/documentos-fiscais/BuscaGlobal";
import { TabelaDocumentos, DocumentoRow } from "@/components/documentos-fiscais/TabelaDocumentos";
import { DocumentoDrawer, DocumentoDetalhe } from "@/components/documentos-fiscais/DocumentoDrawer";
import { UploadDialog } from "@/components/documentos-fiscais/UploadDialog";
import { PerfilEmpresa } from "@/components/documentos-fiscais/PerfilEmpresa";
import { BaseConhecimento } from "@/components/documentos-fiscais/conhecimento/BaseConhecimento";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

type Empresa = {
  id: string; cnpj: string; razaoSocial: string;
  regime: string; porte: string;
  inscricaoEstadual: string | null; inscricaoMunicipal: string | null;
  cnae: string | null; cnaeDescricao: string | null;
  endereco: string | null; telefone: string | null; email: string | null;
  regimeApuracao: string | null;
  tributacaoNacional: Record<string, string> | null;
  tributacaoMunicipal: Record<string, string> | null;
  tributacaoFederal: Record<string, string> | null;
};
type Contador = { tipo: TipoDocumentoFiscal; count: number };
type Kpis = {
  total: number;
  pendentes: number;
  proximoVencimento: { vencimento: string; tipo: string; valorTotal: number | null } | null;
  totalGasto12m: number;
  pagosCount: number;
  atrasadosCount: number;
  totalPagoMes: number;
};

export default function DocumentosFiscaisPage() {
  const router = useRouter();
  const [aba, setAba] = useState<"docs" | "perfil" | "conhecimento">("docs");
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [tipoAtivo, setTipoAtivo] = useState<TipoDocumentoFiscal | "TODOS">("TODOS");
  const [filtroPgto, setFiltroPgto] = useState<StatusPagamentoFiscal | "TODOS">("TODOS");
  const [busca, setBusca] = useState("");
  const [documentos, setDocumentos] = useState<DocumentoRow[]>([]);
  const [contadores, setContadores] = useState<Contador[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documentoSelecionado, setDocumentoSelecionado] = useState<DocumentoDetalhe | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  async function loadEmpresa() {
    const { data, status } = await api<Empresa[]>("/empresas-fiscais");
    if (status === 401) { router.push("/login"); return; }
    if (data && data.length > 0) setEmpresa(data[0]);
  }

  async function loadDados(empresaId?: string) {
    setLoading(true);
    setError("");

    const id = empresaId ?? empresa?.id;
    const params = new URLSearchParams({ page: String(page) });
    if (id) params.set("empresaId", id);
    if (tipoAtivo !== "TODOS") params.set("tipo", tipoAtivo);
    if (filtroPgto !== "TODOS") params.set("statusPagamento", filtroPgto);
    if (busca) params.set("busca", busca);

    const [docRes, contRes, kpiRes] = await Promise.all([
      api<{ documentos: DocumentoRow[]; total: number }>(`/documentos-fiscais?${params}`),
      api<Contador[]>(`/documentos-fiscais/contadores-tipo${id ? `?empresaId=${id}` : ""}`),
      api<Kpis>(`/documentos-fiscais/kpis${id ? `?empresaId=${id}` : ""}`),
    ]);

    if (docRes.status === 401) { router.push("/login"); return; }

    if (docRes.data) {
      setDocumentos(docRes.data.documentos);
      setTotal(docRes.data.total);
    }
    if (contRes.data) setContadores(contRes.data);
    if (kpiRes.data) setKpis(kpiRes.data);

    setLoading(false);
  }

  useEffect(() => { loadEmpresa(); }, []);

  useEffect(() => {
    if (empresa !== null) loadDados();
  }, [empresa, tipoAtivo, filtroPgto, busca, page]);

  const handleBusca = useCallback((q: string) => {
    setBusca(q);
    setPage(1);
  }, []);

  async function handleSelecionar(doc: DocumentoRow) {
    const { data, status } = await api<DocumentoDetalhe>(`/documentos-fiscais/${doc.id}`);
    if (status === 401) { router.push("/login"); return; }
    if (data) setDocumentoSelecionado(data);
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este documento? O arquivo será removido permanentemente.")) return;
    const { status } = await api(`/documentos-fiscais/${id}`, { method: "DELETE" });
    if (status === 401) { router.push("/login"); return; }
    if (status === 200) {
      setDocumentoSelecionado(null);
      loadDados();
    } else {
      setError("Não foi possível excluir o documento.");
    }
  }

  async function handleAtualizado(docParcial: DocumentoDetalhe) {
    // Recarrega o documento completo (com relações) após edição
    const { data } = await api<DocumentoDetalhe>(`/documentos-fiscais/${docParcial.id}`);
    if (data) setDocumentoSelecionado(data);
    loadDados();
  }

  async function handleReprocessar(id: string, modo: "SEMI_AUTO" | "IA") {
    const { status } = await api(`/documentos-fiscais/${id}/reprocessar`, { method: "POST", body: { modo } });
    if (status === 401) { router.push("/login"); return; }
    if (status === 200) {
      const { data } = await api<DocumentoDetalhe>(`/documentos-fiscais/${id}`);
      if (data) setDocumentoSelecionado(data);
      loadDados();
    } else {
      setError("Não foi possível reprocessar.");
    }
  }

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Contabilidade"
        description={empresa ? `${empresa.cnpj} — ${empresa.razaoSocial}` : undefined}
        actions={
          empresa && aba === "docs" ? (
            <Button type="button" onClick={() => setShowUpload(true)}>
              ⬆ Upload
            </Button>
          ) : undefined
        }
      />

      {/* Abas */}
      {empresa && (
        <Tabs
          value={aba}
          onChange={(v) => setAba(v as typeof aba)}
          items={[
            { value: "docs", label: "Documentos Fiscais" },
            { value: "conhecimento", label: "Base de Conhecimento" },
            { value: "perfil", label: "Perfil da Empresa" },
          ]}
        />
      )}

      {empresa && aba === "perfil" && <PerfilEmpresa empresa={empresa} />}

      {empresa && aba === "conhecimento" && <BaseConhecimento />}

      {empresa && aba === "docs" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] flex-1">
              <BuscaGlobal onBusca={handleBusca} />
            </div>
            <Select
              value={filtroPgto}
              onChange={(e) => { setFiltroPgto(e.target.value as StatusPagamentoFiscal | "TODOS"); setPage(1); }}
              className="shrink-0"
            >
              <option value="TODOS">Todos os pagamentos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="ATRASADO">Atrasado</option>
              <option value="ISENTO">Isento</option>
              <option value="NAO_APLICAVEL">N/A</option>
            </Select>
          </div>

          {kpis && (
            <KpiCards
              total={kpis.total}
              pendentes={kpis.pendentes}
              proximoVencimento={kpis.proximoVencimento}
              totalGasto12m={Number(kpis.totalGasto12m)}
              pagosCount={kpis.pagosCount}
              atrasadosCount={kpis.atrasadosCount}
              totalPagoMes={Number(kpis.totalPagoMes)}
            />
          )}

          <div className="grid items-start gap-4 md:grid-cols-[240px,1fr]">
            <SidebarTipos
              contadores={contadores}
              tipoAtivo={tipoAtivo}
              onChange={(t) => { setTipoAtivo(t); setPage(1); }}
            />

            <div className="space-y-3">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {loading ? (
                <Card className="p-8 text-center text-sm text-ink-muted">
                  Carregando...
                </Card>
              ) : (
                <TabelaDocumentos
                  documentos={documentos}
                  onSelecionar={handleSelecionar}
                  onExcluir={handleExcluir}
                  onReprocessar={handleReprocessar}
                />
              )}

              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ←
                  </Button>
                  <span className="text-ink-muted">Página {page} de {totalPages}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    →
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <DocumentoDrawer
        documento={documentoSelecionado}
        onClose={() => setDocumentoSelecionado(null)}
        onExcluir={handleExcluir}
        onReprocessar={handleReprocessar}
        onAtualizado={handleAtualizado}
      />

      {showUpload && empresa && (
        <UploadDialog
          empresaFiscalId={empresa.id}
          onClose={() => setShowUpload(false)}
          onUploadConcluido={loadDados}
        />
      )}
    </div>
  );
}
