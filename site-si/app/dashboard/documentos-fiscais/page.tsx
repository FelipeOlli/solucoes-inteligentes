"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TipoDocumentoFiscal } from "@prisma/client";
import { api } from "@/lib/api";
import { SidebarTipos } from "@/components/documentos-fiscais/SidebarTipos";
import { KpiCards } from "@/components/documentos-fiscais/KpiCards";
import { BuscaGlobal } from "@/components/documentos-fiscais/BuscaGlobal";
import { TabelaDocumentos, DocumentoRow } from "@/components/documentos-fiscais/TabelaDocumentos";
import { DocumentoDrawer, DocumentoDetalhe } from "@/components/documentos-fiscais/DocumentoDrawer";
import { UploadDialog } from "@/components/documentos-fiscais/UploadDialog";
import { PerfilEmpresa } from "@/components/documentos-fiscais/PerfilEmpresa";

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
};

export default function DocumentosFiscaisPage() {
  const router = useRouter();
  const [aba, setAba] = useState<"docs" | "perfil">("docs");
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [tipoAtivo, setTipoAtivo] = useState<TipoDocumentoFiscal | "TODOS">("TODOS");
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
  }, [empresa, tipoAtivo, busca, page]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-theme-primary">Contabilidade</h1>
          {empresa && (
            <p className="text-sm text-theme-muted font-mono">{empresa.cnpj} — {empresa.razaoSocial}</p>
          )}
        </div>
        {empresa && aba === "docs" && (
          <button
            type="button"
            className="px-4 py-2 rounded bg-primary text-white text-sm"
            onClick={() => setShowUpload(true)}
          >
            ⬆ Upload
          </button>
        )}
      </div>

      {/* Abas */}
      {empresa && (
        <div className="flex gap-1 border-b border-theme">
          {(["docs", "perfil"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAba(a)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
                aba === a
                  ? "border-primary text-theme-primary font-medium"
                  : "border-transparent text-theme-muted hover:text-theme"
              }`}
            >
              {a === "docs" ? "Documentos Fiscais" : "Perfil da Empresa"}
            </button>
          ))}
        </div>
      )}

      {empresa && aba === "perfil" && <PerfilEmpresa empresa={empresa} />}

      {empresa && aba === "docs" && (
        <>
          <BuscaGlobal onBusca={handleBusca} />

          {kpis && (
            <KpiCards
              total={kpis.total}
              pendentes={kpis.pendentes}
              proximoVencimento={kpis.proximoVencimento}
              totalGasto12m={Number(kpis.totalGasto12m)}
            />
          )}

          <div className="grid md:grid-cols-[180px,1fr] gap-4 items-start">
            <SidebarTipos
              contadores={contadores}
              tipoAtivo={tipoAtivo}
              onChange={(t) => { setTipoAtivo(t); setPage(1); }}
            />

            <div className="space-y-3">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {loading ? (
                <div className="bg-theme-card border border-theme rounded-lg p-8 text-center text-sm text-theme-muted">
                  Carregando...
                </div>
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
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded border border-theme disabled:opacity-40"
                  >
                    ←
                  </button>
                  <span className="text-theme-muted">Página {page} de {totalPages}</span>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded border border-theme disabled:opacity-40"
                  >
                    →
                  </button>
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
