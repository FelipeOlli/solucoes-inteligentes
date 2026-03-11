# Site Soluções Inteligentes (SI)

Site unificado: **visão dono** (gestão de serviços) + **visão cliente** (acompanhamento por link).

## Documentação de referência

- **Brief e marca:** `../BRIEF-PROJETO-SITE-SI.md`
- **Requisitos:** `../REQUISITOS-E-CENARIOS-SI.md`
- **PRD:** `../PRD-SITE-SOLUCOES-INTELIGENTES.md`
- **Épicos:** `../EPICOS-SITE-SI.md`
- **Arquitetura (lógica, APIs, auth):** `../ARQUITETURA-LOGICA-SITE-SI.md`
- **Telas e fluxos (UX):** `../TELAS-E-FLUXOS-SITE-SI.md`
- **Histórias (SM):** `../stories/` (01.01 a 04.01)

## Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS** (cores e fontes da marca já em `tailwind.config.ts` e `globals.css`)

## Como rodar

```bash
npm install --legacy-peer-deps
cp .env.example .env   # se ainda não tiver .env
npx prisma db push     # cria o banco SQLite
npx tsx prisma/seed.ts # cria usuário dono (dono@solucoesinteligentes.com / senha123)
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

**Login (dono):** e-mail `dono@solucoesinteligentes.com`, senha `senha123`.

## Estrutura atual (scaffold)

- `app/page.tsx` – Home (links para área dono e acompanhamento)
- `app/login/page.tsx` – Login dono (placeholder)
- `app/acompanhar/[[...token]]/page.tsx` – Acesso cliente por link+token (placeholder)

Backend (API) ainda não está neste repositório; implementar conforme ARQUITETURA-LOGICA-SITE-SI.md (modelo de dados, endpoints, autenticação). Pode ser um projeto Node/Express ou Next.js API routes no mesmo app.

## Ordem sugerida de implementação

1. **Story 03.01** – Auth dono + token cliente (backend + front login e rota acompanhar)
2. **Story 01.01** – Cadastro e listagem de clientes
3. **Story 02.01** – CRUD e gestão de serviços (dono)
4. **Story 04.01** – Acompanhamento (visão cliente)
