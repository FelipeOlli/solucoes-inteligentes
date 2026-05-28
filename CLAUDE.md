# Soluções Inteligentes

## Stack
- Framework: Next.js 16 (App Router) + TypeScript
- Banco: PostgreSQL + Prisma 5
- Auth: JWT manual com `jose` (sem next-auth)
- Deploy: EasyPanel (Hetzner) — serviço `site-si`
- Porta local: 3000

## Rodar
```bash
cd site-si
cp .env.example .env   # preencher DATABASE_URL e JWT_SECRET
npm install
npx prisma db push
npm run dev
```

## Decisões que NÃO devem ser revertidas
- JWT manual (jose): escolha explícita — não migrar para next-auth
- `nanoid` para IDs de link de cliente: garante URLs não-adivinháveis

## Armadilhas
- `@` na senha do DATABASE_URL deve ser escapado como `%40`
- `npm run build` executa `prisma generate` automaticamente; não rodar generate separado
- Novos models/colunas no schema DEVEM ter migration em `prisma/migrations/` — sem ela, `prisma migrate deploy` ignora no deploy e queries com `include` jogam 500
- Next.js 16: params em route handlers dinâmicos é `Promise<{ id: string }>` — sempre fazer `await params`

## Deploy EasyPanel — como funciona (NÃO alterar esta lógica)
O Dockerfile tem **duas fases separadas**:

**Fase BUILD** (`RUN npm run build`):
- O banco não está acessível — DATABASE_URL aponta para `localhost:5432` (fictício)
- `npm run build` deve executar APENAS: `prisma generate && next build`
- NUNCA adicionar `prisma migrate deploy` ao script `build` do package.json — causa erro P1001

**Fase STARTUP** (`CMD`):
- O container já está rodando e o banco (`sidb`) está acessível via rede interna do EasyPanel
- O CMD do Dockerfile já executa na ordem: `prisma migrate deploy` → `seed` → `npm start`
- As migrations são aplicadas aqui, não no build

**Regra**: migrations novas só precisam do arquivo em `prisma/migrations/` — o CMD cuida do resto no próximo deploy.

## Padrões do projeto
- Rotas do dono em `app/dashboard/`, rotas do cliente em `app/acompanhar/`
- APIs em `app/api/` com route handlers (não pages/api)
- Estilo: Tailwind puro, sem biblioteca de componentes
- Seed em `prisma/seed.ts`, rodar com `npm run db:seed`

## Módulo Contabilidade (Documentos Fiscais)
- Tabelas: `EmpresaFiscal`, `DocumentoFiscal`, `ObrigacaoFiscal` (migration `20260419000000_add_documentos_fiscais`)
- Upload de PDFs em `/public/uploads/documentos-fiscais/{empresaId}/{uuid}.pdf`
- Três modos de extração: MANUAL, SEMI_AUTO (regex), IA (Claude Sonnet via `lib/fiscal/extractor-ia.ts`)
- Deduplicação por SHA-256; reprocessar reutiliza `textoExtraido` do banco
- EmpresaFiscal padrão criada no seed com CNPJ `20.273.228/0001-62`
- `ANTHROPIC_API_KEY` obrigatória no EasyPanel para modo IA

## Módulo Base de Conhecimento
- Tabelas: `ArtigoConhecimento`, `AnexoConhecimento` (migration `20260520000000_add_conhecimento`)
- Terceira aba na página `/dashboard/documentos-fiscais` (junto com Documentos Fiscais e Perfil da Empresa)
- API em `app/api/contabilidade/conhecimento/` — CRUD de artigos + upload/remoção de anexos
- Anexos salvos em `/public/uploads/conhecimento/{artigoId}/{uuid}.{ext}`
- Tipos aceitos: PDF, HTML, TXT, CSV, XLSX, XLS, DOCX, DOC, JPG, PNG — até 20 MB
- Soft delete via campo `ativo`; filtros por título (busca) e categoria
- Componentes em `components/documentos-fiscais/conhecimento/`

## Variáveis obrigatórias
DATABASE_URL
JWT_SECRET
NEXT_PUBLIC_APP_URL
ANTHROPIC_API_KEY

## Regra de sessão
Ao encerrar, adicione 1 linha em "Sessões recentes" abaixo.
Se já houver 3 entradas, REMOVA a mais antiga antes de adicionar.
Commits detalhados vão no git, não aqui.

## Módulo Painel Financeiro
- Campos no model `Servico`: `valorRepasse Float?` (migration `20260522`), `valorMaterial Float?` (migration `20260524`)
- Fórmula de lucro em `lib/lucro.ts`: `receita × (1 − taxa_cartão%) − repasse − material` — custo fixo R$50 NÃO entra (é só auxiliar de precificação na calculadora de orçamento)
- API `app/api/financeiro/resumo/route.ts` — agrega 12 meses: receita, repasse, material, taxa cartão, lucro operacional + gasto contábil (DocumentoFiscal pago) → lucro líquido
- Página `app/dashboard/financeiro/page.tsx` — KPIs (receita, lucro operacional, contabilidade, lucro líquido, concluídos, abertos), gráfico de barras, gráfico de linha, tabela 12 meses
- Badges de status: CONCLUIDO=verde, CANCELADO=vermelho, demais=amarelo (dashboard + detalhe)
- Calculadora de orçamento (`/dashboard/orcamento`) usa FIXO=R$50 localmente apenas para precificação

## Módulo Técnicos
- Campos bancários opcionais: `chavePix`, `banco`, `agencia`, `conta` (migration `20260524300000_add_tecnico_dados_bancarios`)
- Tabela exibe PIX com prioridade; se não tiver, mostra banco/agência/conta

## Sessões recentes
### 2026-05-22 — Painel Financeiro
Estado atual: campo `valorRepasse` no serviço; painel `/dashboard/financeiro` com KPIs do mês (receita, repasse, lucro, concluídos, abertos), gráfico de barras e linha (Recharts), tabela resumo 12 meses | Armadilha: migration `20260522000000_add_valor_repasse` precisa rodar no EasyPanel antes do deploy; lucro calculado só nos CONCLUIDOS com dataConclusao preenchida
### 2026-05-24 — Financeiro refinado + Técnicos bancários
Estado atual: lucro real sem custo fixo arbitrário; gasto contabilidade integrado ao painel via DocumentoFiscal; técnicos com dados bancários (PIX/conta); badges de status coloridos; calculadora de orçamento separada da fórmula de lucro | Migrations: add_valor_material, add_tecnico_dados_bancarios, remove_emite_nota_fiscal
### 2026-05-26 — Gerador de Stories
Estado atual: PNG pixel-perfect via `foreignObjectRendering:true` + inline de imagens e fontes Google Fonts no clone; etiqueta superior 50% maior (69px, nowrap); safe zones do Instagram (logo top:200px, rodapé bottom:240px); risco vermelho e selo -40% alinhados; bloco de sugestão de título com IA removido | Armadilha: `foreignObjectRendering` exige que todas as `<img>` e fontes sejam data URLs antes da captura — funções `inlinarImagens` e `inlinarFontes` fazem isso em `baixarStory()`
