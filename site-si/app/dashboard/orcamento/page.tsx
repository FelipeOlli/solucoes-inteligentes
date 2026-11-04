"use client";

import RepositorioAnexos from "@/components/orcamento/RepositorioAnexos";
import CalculadoraPrecificacao from "@/components/orcamento/CalculadoraPrecificacao";
import { PageHeader } from "@/components/ui/page-header";

export default function OrcamentoPage() {
  return (
    <div>
      <PageHeader
        title="Orçamento"
        description="Precificação detalhada do serviço."
      />

      <div className="max-w-2xl">
        <CalculadoraPrecificacao />
      </div>

      <RepositorioAnexos />
    </div>
  );
}
