"use client";

import { useRef, useState } from "react";

type Modo = "MANUAL" | "SEMI_AUTO" | "IA";

type ResultadoUpload = {
  documento: {
    id: string;
    tipoDocumento: string;
    statusProcessamento: string;
    competencia: string | null;
    valorTotal: string | null;
    nomeArquivo: string;
  };
  resultado: {
    tipo: string;
    confidence: number;
    obrigacoesGeradas: number;
  } | null;
};

type Props = {
  empresaFiscalId: string;
  onClose: () => void;
  onUploadConcluido: () => void;
};

const MODOS: { value: Modo; label: string; descricao: string }[] = [
  {
    value: "MANUAL",
    label: "Manual",
    descricao: "Faz upload sem extrair dados. Você preenche tudo pelo formulário de edição.",
  },
  {
    value: "SEMI_AUTO",
    label: "Semiautomático",
    descricao: "Extrai dados via regex (rápido, sem custo). Pode falhar em documentos mal formatados.",
  },
  {
    value: "IA",
    label: "Com IA",
    descricao: "Envia o texto ao Claude Sonnet para extração precisa. Recomendado para documentos complexos.",
  },
];

export function UploadDialog({ empresaFiscalId, onClose, onUploadConcluido }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<Modo>("SEMI_AUTO");
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [progresso, setProgresso] = useState<Record<string, "aguardando" | "enviando" | "ok" | "erro" | "duplicado">>({});
  const [resultados, setResultados] = useState<Record<string, ResultadoUpload["resultado"]>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  function addFiles(novos: FileList | null) {
    if (!novos) return;
    const pdfs = Array.from(novos).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    setFiles((prev) => {
      const nomes = new Set(prev.map((f) => f.name));
      return [...prev, ...pdfs.filter((f) => !nomes.has(f.name))];
    });
  }

  async function enviar() {
    setUploading(true);
    for (const file of files) {
      setProgresso((p) => ({ ...p, [file.name]: "enviando" }));
      const fd = new FormData();
      fd.append("file", file);
      fd.append("empresaFiscalId", empresaFiscalId);
      fd.append("modo", modo);

      const res = await fetch("/api/documentos-fiscais/upload", {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${localStorage.getItem("si_token") ?? ""}` },
      });

      if (res.status === 409) {
        setProgresso((p) => ({ ...p, [file.name]: "duplicado" }));
        setErros((e) => ({ ...e, [file.name]: "Arquivo já enviado anteriormente." }));
        continue;
      }

      if (!res.ok) {
        setProgresso((p) => ({ ...p, [file.name]: "erro" }));
        const body = await res.json().catch(() => ({}));
        setErros((e) => ({ ...e, [file.name]: body.message || "Erro no upload." }));
        continue;
      }

      const data: ResultadoUpload = await res.json();
      setProgresso((p) => ({ ...p, [file.name]: "ok" }));
      setResultados((r) => ({ ...r, [file.name]: data.resultado }));
    }
    setUploading(false);
    onUploadConcluido();
  }

  const todosFeitos = files.length > 0 && files.every(
    (f) => progresso[f.name] && progresso[f.name] !== "aguardando" && progresso[f.name] !== "enviando"
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-theme-card border border-theme rounded-lg w-full max-w-lg space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-theme-primary">Upload de documentos fiscais</h2>
            <button type="button" onClick={onClose} className="text-theme-muted">✕</button>
          </div>

          {/* Seletor de modo */}
          <div>
            <p className="text-xs text-theme-muted mb-2">Modo de extração</p>
            <div className="grid grid-cols-3 gap-2">
              {MODOS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModo(m.value)}
                  className={`rounded border p-2 text-left transition-colors ${
                    modo === m.value
                      ? "border-primary bg-primary/10 text-theme-primary"
                      : "border-theme text-theme-muted hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{m.label}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-theme-muted mt-2">
              {MODOS.find((m) => m.value === modo)?.descricao}
            </p>
          </div>

          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-theme hover:border-primary/50"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          >
            <p className="text-theme-muted text-sm">
              Arraste PDFs aqui ou <span className="text-primary underline">clique para selecionar</span>
            </p>
            <p className="text-xs text-theme-muted mt-1">Máx. 20MB por arquivo • Somente PDF</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* Lista de arquivos */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file) => {
                const status = progresso[file.name];
                const res = resultados[file.name];
                const erro = erros[file.name];
                return (
                  <div key={file.name} className="rounded border border-theme p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs shrink-0">
                        {!status && "⏳"}
                        {status === "enviando" && (modo === "IA" ? "🤖 Analisando..." : "⏳ Enviando...")}
                        {status === "ok" && "✅"}
                        {status === "erro" && "❌"}
                        {status === "duplicado" && "⚠️"}
                      </span>
                    </div>
                    {erro && <p className="text-xs text-amber-500">{erro}</p>}
                    {res && (
                      <p className="text-xs text-green-500">
                        {res.tipo.replace(/_/g, " ")} • Confiança: {Math.round(res.confidence * 100)}% •{" "}
                        {res.obrigacoesGeradas} obrigação(ões)
                      </p>
                    )}
                    {status === "ok" && modo === "MANUAL" && (
                      <p className="text-xs text-theme-muted">Salvo — preencha os dados pelo botão Editar.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-theme text-sm">
              Fechar
            </button>
            {!todosFeitos && files.length > 0 && (
              <button
                type="button"
                onClick={enviar}
                disabled={uploading}
                className="px-4 py-2 rounded bg-primary text-white text-sm disabled:opacity-60"
              >
                {uploading
                  ? modo === "IA" ? "Analisando com IA..." : "Enviando..."
                  : `Enviar ${files.length} arquivo(s)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
