"use client";

import RepositorioAnexos from "@/components/orcamento/RepositorioAnexos";
import CalculadoraPrecificacao from "@/components/orcamento/CalculadoraPrecificacao";

export default function OrcamentoPage() {
  return (
    <div className="text-theme">
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-2">Orçamento</h1>
      <p className="text-body text-theme-muted mb-6">Precificação detalhada do serviço.</p>

      <div className="max-w-2xl">
        <CalculadoraPrecificacao />
      </div>

      <RepositorioAnexos />
    </div>
  );
}
