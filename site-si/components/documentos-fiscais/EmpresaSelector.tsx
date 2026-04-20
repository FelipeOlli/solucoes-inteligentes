"use client";

type Empresa = { id: string; cnpj: string; razaoSocial: string };

type Props = {
  empresas: Empresa[];
  empresaId: string | null;
  onChange: (id: string | null) => void;
};

export function EmpresaSelector({ empresas, empresaId, onChange }: Props) {
  if (empresas.length === 0) return null;

  return (
    <select
      value={empresaId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="px-3 py-2 rounded border border-theme bg-theme-card text-sm focus:outline-none"
    >
      <option value="">Todas as empresas</option>
      {empresas.map((e) => (
        <option key={e.id} value={e.id}>
          {e.cnpj} — {e.razaoSocial}
        </option>
      ))}
    </select>
  );
}
