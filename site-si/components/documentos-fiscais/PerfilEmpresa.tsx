"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

type Empresa = {
  id: string;
  cnpj: string;
  razaoSocial: string;
  regime: string;
  porte: string;
  inscricaoEstadual: string | null;
  inscricaoMunicipal: string | null;
  cnae: string | null;
  cnaeDescricao: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  regimeApuracao: string | null;
  tributacaoNacional: Record<string, string> | null;
  tributacaoMunicipal: Record<string, string> | null;
  tributacaoFederal: Record<string, string> | null;
};

type DocEmpresa = {
  id: string;
  categoria: "CONTRATO_SOCIAL" | "CERTIFICADO_DIGITAL";
  nome: string;
  descricao: string | null;
  arquivoUrl: string | null;
  nomeArquivo: string | null;
  tamanhoBytes: number | null;
  dataValidade: string | null;
  createdAt: string;
};

const CAT_LABEL: Record<DocEmpresa["categoria"], string> = {
  CONTRATO_SOCIAL: "Contrato Social",
  CERTIFICADO_DIGITAL: "Certificado Digital",
};

const REGIME_LABELS: Record<string, string> = {
  SIMPLES_NACIONAL: "Simples Nacional",
  LUCRO_PRESUMIDO: "Lucro Presumido",
  LUCRO_REAL: "Lucro Real",
  MEI: "MEI",
};
const PORTE_LABELS: Record<string, string> = { MEI: "MEI", ME: "ME", EPP: "EPP" };

type Props = { empresa: Empresa };

export function PerfilEmpresa({ empresa: inicial }: Props) {
  const [empresa, setEmpresa] = useState<Empresa>(inicial);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<Empresa>(inicial);
  const [docs, setDocs] = useState<DocEmpresa[]>([]);
  const [docsCarregados, setDocsCarregados] = useState(false);
  const [uploadCategoria, setUploadCategoria] = useState<DocEmpresa["categoria"]>("CONTRATO_SOCIAL");
  const [uploadNome, setUploadNome] = useState("");
  const [uploadValidade, setUploadValidade] = useState("");
  const [uploadArquivo, setUploadArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregarDocs() {
    const { data } = await api<DocEmpresa[]>(`/empresas-fiscais/${empresa.id}/documentos`);
    if (data) { setDocs(data); setDocsCarregados(true); }
  }

  if (!docsCarregados) carregarDocs();

  function abrirEdicao() {
    setForm({ ...empresa });
    setErro("");
    setEditando(true);
  }

  function setTrib(setor: "tributacaoNacional" | "tributacaoMunicipal" | "tributacaoFederal", key: string, val: string) {
    setForm((f) => ({ ...f, [setor]: { ...(f[setor] ?? {}), [key]: val } }));
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    const { data, status } = await api<Empresa>(`/empresas-fiscais/${empresa.id}`, {
      method: "PATCH",
      body: form,
    });
    setSalvando(false);
    if (status === 200 && data) { setEmpresa(data); setForm(data); setEditando(false); }
    else setErro("Não foi possível salvar.");
  }

  async function enviarDoc() {
    if (!uploadArquivo || !uploadNome.trim()) return;
    setEnviando(true);
    setErro("");
    const fd = new FormData();
    fd.append("file", uploadArquivo);
    fd.append("categoria", uploadCategoria);
    fd.append("nome", uploadNome.trim());
    if (uploadValidade) fd.append("dataValidade", uploadValidade);
    const res = await fetch(`/api/empresas-fiscais/${empresa.id}/documentos`, {
      method: "POST",
      body: fd,
      headers: { Authorization: `Bearer ${localStorage.getItem("si_token") ?? ""}` },
    });
    setEnviando(false);
    if (res.ok) {
      const body = await res.json() as DocEmpresa & { lembreteAgendado?: boolean };
      setDocs((d) => [body, ...d]);
      setUploadNome(""); setUploadValidade(""); setUploadArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      if (body.lembreteAgendado) {
        const dataStr = uploadValidade
          ? new Date(uploadValidade).toLocaleDateString("pt-BR")
          : "";
        setSucesso(`Lembrete criado na agenda para 5 dias antes do vencimento${dataStr ? ` (${dataStr})` : ""}.`);
        setTimeout(() => setSucesso(""), 6000);
      }
    } else {
      const b = await res.json().catch(() => ({}));
      setErro(b.message || "Erro no upload.");
    }
  }

  async function excluirDoc(docId: string) {
    await api(`/empresas-fiscais/${empresa.id}/documentos/${docId}`, { method: "DELETE" });
    setDocs((d) => d.filter((x) => x.id !== docId));
  }

  const f = editando ? form : empresa;

  return (
    <div className="space-y-6">
      {/* ── Identificação ── */}
      <div className="bg-theme-card border border-theme rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-theme-primary">Identificação</h2>
          {!editando ? (
            <button type="button" onClick={abrirEdicao}
              className="px-3 py-1.5 text-xs rounded border border-theme text-theme-muted hover:text-theme transition-colors">
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditando(false)}
                className="px-3 py-1.5 text-xs rounded border border-theme text-theme-muted">
                Cancelar
              </button>
              <button type="button" onClick={salvar} disabled={salvando}
                className="px-3 py-1.5 text-xs rounded bg-primary text-white disabled:opacity-60">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          )}
        </div>

        {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="CNPJ" value={empresa.cnpj} />
          <EditField label="Razão Social" value={f.razaoSocial} editando={editando}
            onChange={(v) => setForm((x) => ({ ...x, razaoSocial: v }))} />
          <div>
            <p className="text-xs text-theme-muted mb-1">Regime Tributário</p>
            {editando ? (
              <select value={f.regime} onChange={(e) => setForm((x) => ({ ...x, regime: e.target.value }))}
                className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm">
                {Object.entries(REGIME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            ) : <p className="text-sm">{REGIME_LABELS[empresa.regime] ?? empresa.regime}</p>}
          </div>
          <div>
            <p className="text-xs text-theme-muted mb-1">Porte</p>
            {editando ? (
              <select value={f.porte} onChange={(e) => setForm((x) => ({ ...x, porte: e.target.value }))}
                className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm">
                {Object.entries(PORTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            ) : <p className="text-sm">{PORTE_LABELS[empresa.porte] ?? empresa.porte}</p>}
          </div>
          <EditField label="Inscrição Estadual" value={f.inscricaoEstadual ?? ""} editando={editando}
            onChange={(v) => setForm((x) => ({ ...x, inscricaoEstadual: v || null }))} />
          <EditField label="Inscrição Municipal" value={f.inscricaoMunicipal ?? ""} editando={editando}
            onChange={(v) => setForm((x) => ({ ...x, inscricaoMunicipal: v || null }))} />
          <EditField label="CNAE" value={f.cnae ?? ""} editando={editando} mono
            onChange={(v) => setForm((x) => ({ ...x, cnae: v || null }))} />
          <EditField label="Descrição CNAE" value={f.cnaeDescricao ?? ""} editando={editando}
            onChange={(v) => setForm((x) => ({ ...x, cnaeDescricao: v || null }))} />
          <EditField label="Endereço" value={f.endereco ?? ""} editando={editando}
            onChange={(v) => setForm((x) => ({ ...x, endereco: v || null }))} />
          <EditField label="Telefone" value={f.telefone ?? ""} editando={editando} mono
            onChange={(v) => setForm((x) => ({ ...x, telefone: v || null }))} />
          <EditField label="E-mail" value={f.email ?? ""} editando={editando}
            onChange={(v) => setForm((x) => ({ ...x, email: v || null }))} />
          <EditField label="Regime de Apuração" value={f.regimeApuracao ?? ""} editando={editando}
            onChange={(v) => setForm((x) => ({ ...x, regimeApuracao: v || null }))} />
        </div>
      </div>

      {/* ── Tributação ── */}
      <div className="bg-theme-card border border-theme rounded-lg p-5">
        <h2 className="font-heading font-semibold text-theme-primary mb-4">Tributação</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TribSetor title="Nacional" campos={[
            { key: "nbs", label: "NBS" },
            { key: "operacao", label: "Operação" },
            { key: "aliquota", label: "Alíquota (%)" },
          ]} dados={f.tributacaoNacional ?? {}} editando={editando}
            onChange={(k, v) => setTrib("tributacaoNacional", k, v)} />
          <TribSetor title="Municipal" campos={[
            { key: "operacao", label: "Operação" },
            { key: "aliquota", label: "Alíquota (%)" },
          ]} dados={f.tributacaoMunicipal ?? {}} editando={editando}
            onChange={(k, v) => setTrib("tributacaoMunicipal", k, v)} />
          <TribSetor title="Federal (Simples)" campos={[
            { key: "pisCofins", label: "PIS/COFINS" },
            { key: "aliquotaSimplesNacional", label: "Alíquota Simples (%)" },
          ]} dados={f.tributacaoFederal ?? {}} editando={editando}
            onChange={(k, v) => setTrib("tributacaoFederal", k, v)} />
        </div>
      </div>

      {/* ── Documentos Fixos ── */}
      <div className="bg-theme-card border border-theme rounded-lg p-5">
        <h2 className="font-heading font-semibold text-theme-primary mb-4">Documentos Fixos</h2>

        {/* Upload */}
        <div className="border border-theme rounded-lg p-4 mb-4 space-y-3">
          <p className="text-xs text-theme-muted font-medium">Adicionar documento</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-theme-muted mb-1">Categoria</p>
              <select value={uploadCategoria}
                onChange={(e) => setUploadCategoria(e.target.value as DocEmpresa["categoria"])}
                className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm">
                <option value="CONTRATO_SOCIAL">Contrato Social</option>
                <option value="CERTIFICADO_DIGITAL">Certificado Digital</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-theme-muted mb-1">Nome / Descrição</p>
              <input type="text" value={uploadNome} onChange={(e) => setUploadNome(e.target.value)}
                placeholder="Ex: Contrato Social 2024"
                className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm" />
            </div>
            <div>
              <p className="text-xs text-theme-muted mb-1">Validade (opcional)</p>
              <input type="date" value={uploadValidade} onChange={(e) => setUploadValidade(e.target.value)}
                className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm" />
            </div>
            <div>
              <p className="text-xs text-theme-muted mb-1">Arquivo (PDF, JPG, PNG)</p>
              <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setUploadArquivo(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-theme-muted" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={enviarDoc}
              disabled={enviando || !uploadArquivo || !uploadNome.trim()}
              className="px-4 py-2 rounded bg-primary text-white text-sm disabled:opacity-60">
              {enviando ? "Enviando..." : "Adicionar"}
            </button>
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            {sucesso && <p className="text-xs text-green-600">{sucesso}</p>}
          </div>
        </div>

        {/* Lista */}
        {docs.length === 0 ? (
          <p className="text-sm text-theme-muted text-center py-4">Nenhum documento fixo cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded border border-theme px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {CAT_LABEL[doc.categoria]}
                    </span>
                    <span className="text-sm font-medium truncate">{doc.nome}</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-theme-muted">
                    {doc.nomeArquivo && <span>{doc.nomeArquivo}</span>}
                    {doc.tamanhoBytes && <span>{(doc.tamanhoBytes / 1024).toFixed(1)} KB</span>}
                    {doc.dataValidade && (
                      <span>Validade: {new Date(doc.dataValidade).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.arquivoUrl && (
                    <a href={doc.arquivoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:opacity-70 transition-opacity" title="Abrir">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </a>
                  )}
                  <button type="button" onClick={() => excluirDoc(doc.id)}
                    className="text-red-500 hover:opacity-70 transition-opacity" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-theme-muted mb-1">{label}</p>
      <p className="text-sm font-mono">{value || "—"}</p>
    </div>
  );
}

function EditField({ label, value, editando, onChange, mono }: {
  label: string; value: string; editando: boolean;
  onChange: (v: string) => void; mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-theme-muted mb-1">{label}</p>
      {editando ? (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 rounded border border-theme bg-transparent text-sm ${mono ? "font-mono" : ""}`} />
      ) : (
        <p className={`text-sm ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
      )}
    </div>
  );
}

function TribSetor({ title, campos, dados, editando, onChange }: {
  title: string;
  campos: { key: string; label: string }[];
  dados: Record<string, string>;
  editando: boolean;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-theme-muted uppercase tracking-wide">{title}</p>
      {campos.map((c) => (
        <div key={c.key}>
          <p className="text-xs text-theme-muted mb-1">{c.label}</p>
          {editando ? (
            <input type="text" value={dados[c.key] ?? ""}
              onChange={(e) => onChange(c.key, e.target.value)}
              className="w-full px-3 py-2 rounded border border-theme bg-transparent text-sm" />
          ) : (
            <p className="text-sm">{dados[c.key] || "—"}</p>
          )}
        </div>
      ))}
    </div>
  );
}
