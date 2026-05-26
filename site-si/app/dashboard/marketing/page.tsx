"use client";

import Link from "next/link";

export default function MarketingPage() {
  return (
    <div className="text-theme">
      <h1 className="font-heading text-xl sm:text-2xl font-bold text-theme-primary mb-2">Marketing</h1>
      <p className="text-sm text-theme-muted mb-6">Ferramentas de criação de conteúdo e divulgação.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/marketing/gerador-stories"
          className="block p-5 rounded-xl border border-theme bg-theme-card hover:opacity-80 transition"
        >
          <div className="text-2xl mb-2">🎨</div>
          <h2 className="font-semibold text-theme-primary mb-1">Gerador de Stories</h2>
          <p className="text-sm text-theme-muted">Crie artes 1080×1920 para ofertas no Instagram com sugestão de copy via IA.</p>
        </Link>
      </div>
    </div>
  );
}
