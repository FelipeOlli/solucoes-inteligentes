"use client";

import { Select } from "@/components/ui/select";

type Empresa = { id: string; cnpj: string; razaoSocial: string };

type Props = {
  empresas: Empresa[];
  empresaId: string | null;
  onChange: (id: string | null) => void;
};

export function EmpresaSelector({ empresas, empresaId, onChange }: Props) {
  if (empresas.length === 0) return null;

  return (
    <Select
      value={empresaId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Todas as empresas</option>
      {empresas.map((e) => (
        <option key={e.id} value={e.id}>
          {e.cnpj} — {e.razaoSocial}
        </option>
      ))}
    </Select>
  );
}
