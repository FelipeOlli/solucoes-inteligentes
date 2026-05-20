"use client";

export type Artigo = {
  id: string;
  titulo: string;
  categoria: string | null;
  descricao: string | null;
  conteudo: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  anexos: Anexo[];
};

export type Anexo = {
  id: string;
  artigoId: string;
  nomeArquivo: string;
  url: string;
  mimeType: string;
  tamanhoBytes: number;
  createdAt: string;
};

type Props = {
  artigo: Artigo;
  onClick: () => void;
};

export function ArtigoCard({ artigo, onClick }: Props) {
  const data = new Date(artigo.updatedAt).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-theme-card border border-theme rounded-lg p-4 hover:border-primary transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-theme-primary truncate">{artigo.titulo}</p>
          {artigo.descricao && (
            <p className="text-sm text-theme-muted mt-0.5 line-clamp-2">{artigo.descricao}</p>
          )}
        </div>
        {artigo.categoria && (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {artigo.categoria}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-theme-muted">
        {artigo.anexos.length > 0 && (
          <span>📎 {artigo.anexos.length} anexo{artigo.anexos.length > 1 ? "s" : ""}</span>
        )}
        <span>Atualizado {data}</span>
      </div>
    </button>
  );
}
