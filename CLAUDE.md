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
- Campos no model `Servico`: `valorRepasse Float?` (migration `20260522`), `valorMaterial Float?` (migration `20260524`), `custoFixo`, `valorGarantia`, `taxaPercentual`, `impostoPercentual`, `parcelas` (todos `Float?`/`Int?`, migration `20260814000000_add_snapshot_precificacao`)
- Fórmula de lucro em `lib/lucro.ts` (`composicaoLucro`): `receita − receita×taxa% − receita×imposto% − repasse − material − custoFixo − garantia`
- **Snapshot**: serviço criado a partir da calculadora de orçamento (`/dashboard/orcamento` → botão "Criar serviço com este orçamento") grava `taxaPercentual` (taxa real da forma/parcelas, tabela SumUp) e `impostoPercentual` (DAS+ISS, Simples Anexo III) no momento da criação — não recalcula depois, mesmo se a tabela de taxas mudar
- **Fallback**: serviço criado à mão (sem snapshot) usa taxa fixa por forma de pagamento (`taxaPorPagamento`, ainda em `lib/lucro.ts`) e imposto = 0 — comportamento antigo preservado
- `custoFixo` (deslocamento) e `valorGarantia` são editáveis no detalhe do serviço; `taxaPercentual`/`impostoPercentual`/`parcelas` só vêm do orçamento
- API `app/api/financeiro/resumo/route.ts` — agrega 12 meses via `composicaoLucro`: receita, repasse, material, deslocamento, garantia, taxa cartão, imposto, lucro operacional + gasto contábil (DocumentoFiscal pago) → lucro líquido
- Página `app/dashboard/financeiro/page.tsx` — KPIs (receita, lucro operacional, contabilidade, lucro líquido, concluídos, abertos), breakdown com 8 componentes, gráfico de barras, gráfico de linha, tabela 12 meses
- Badges de status: CONCLUIDO=verde, CANCELADO=vermelho, demais=amarelo (dashboard + detalhe)

## Módulo Técnicos
- Campos bancários opcionais: `chavePix`, `banco`, `agencia`, `conta` (migration `20260524300000_add_tecnico_dados_bancarios`)
- Tabela exibe PIX com prioridade; se não tiver, mostra banco/agência/conta

## Sessões recentes
### 2026-06-02 — Stories: área de link de afiliado
Estado atual: bloco "Achou na @solucoesinteligentes_si" movido para o fundo da arte (bottom: 45px); área invisível reservada acima (bottom: 130px, height: 96px) para sticker de link do Instagram (Mercado Livre afiliado) — sem borda, sem texto, área limpa | Arquivos: `app/dashboard/marketing/gerador-stories/page.tsx`, `gerador-stories.module.css`
### 2026-06-16 — Vídeos na seção de fotos do serviço
Estado atual: seção "Fotos / imagens / vídeos" aceita mp4, mov, webm e outros formatos de vídeo; vídeos renderizam como `<video controls>` na galeria (imagens continuam como `<img>`); vídeos não caem na lista de "Anexar Documentos"; API de upload não foi alterada | Arquivo: `app/dashboard/servicos/[id]/page.tsx` (helper `isVideoFileName`, filtros nos handlers e no render)
### 2026-07-14 — Fix cheque no enum + data de conclusão no futuro
Estado atual: `FormaPagamento` ganhou valor `CHEQUE` (schema + migration `20260714000000_add_cheque_forma_pagamento`) — commit anterior só adicionou na UI, faltava enum/migration; `localDateIso` agora usa hora atual em vez de meio-dia fixo, corrigindo bloqueio falso de "data_conclusao não pode ser no futuro" ao concluir serviço no mesmo dia antes do meio-dia | Arquivos: `prisma/schema.prisma`, `prisma/migrations/20260714000000_add_cheque_forma_pagamento/migration.sql`, `app/dashboard/servicos/[id]/page.tsx`
