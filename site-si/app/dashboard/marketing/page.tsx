"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FERRAMENTAS = [
  {
    href: "/dashboard/marketing/gerador-stories",
    emoji: "🎨",
    title: "Gerador de Stories",
    description:
      "Crie artes 1080×1920 para ofertas no Instagram com sugestão de copy via IA.",
  },
];

export default function MarketingPage() {
  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Ferramentas de criação de conteúdo e divulgação."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FERRAMENTAS.map((f) => (
          <Link key={f.href} href={f.href} className="group">
            <Card className="h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
              <CardHeader>
                <span className="mb-1 text-3xl transition-transform duration-300 group-hover:rotate-12">
                  {f.emoji}
                </span>
                <CardTitle>{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
