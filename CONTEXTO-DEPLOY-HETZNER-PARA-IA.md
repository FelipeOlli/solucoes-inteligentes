# Contexto: Deploy do Site SI no Hetzner (para uso em outra IA)

Este documento é uma **extração da conversa** sobre colocar o site Soluções Inteligentes (SI) online. Use este markdown como contexto para outra IA auxiliar na criação/configuração no servidor Hetzner.

---

## 1. Contexto do projeto

- **Projeto:** Site Soluções Inteligentes (SI) – gestão de serviços (visão dono) + acompanhamento (visão cliente).
- **Stack:** Next.js 16, React, Prisma, **SQLite** (banco em arquivo), autenticação JWT, Tailwind.
- **Pasta do app:** `site-si` (pode estar dentro de um monorepo, ex.: `projetos/solucoes-inteligentes/site-si`).
- **Objetivo:** Site online, totalmente funcional, com **facilidade para subir alterações** (push → redeploy).

---

## 2. Decisão: hospedar no servidor Hetzner com EasyPanel

- O usuário **já tem um servidor na Hetzner com EasyPanel instalado**.
- Foi decidido **postar tudo no Hetzner** (e não em Render, Railway ou Vercel) porque:
  - **SQLite:** Render/Railway suportam com volume, mas Render tem cold start e Railway tem crédito limitado no free. Vercel **não suporta** SQLite (ambiente serverless, disco efêmero).
  - **Controle e previsibilidade:** No Hetzner não há cold start, não há limite de crédito de terceiro, e o banco fica no volume do próprio servidor.
  - **Atualizações:** Push no Git + Redeploy no EasyPanel mantém o fluxo simples; o volume persiste e o banco não é apagado.

---

## 3. Onde fica o banco SQLite

- **Desenvolvimento (local):** arquivo na pasta do projeto (ex.: `site-si/dev.db`), definido por `DATABASE_URL` no `.env` (ex.: `file:./dev.db`). Não commitar `.env` nem `*.db`.
- **Produção (Hetzner/EasyPanel):** o app roda em container. O Prisma usa **`/app/data/si.db`**. Para o arquivo **não sumir** em redeploy/restart, é obrigatório criar um **volume** no EasyPanel:
  - **Container path:** `/app/data`
  - **Volume name:** ex. `site-si-data`
  - **Variável:** `DATABASE_URL=file:/app/data/si.db`

O usuário **não** envia o arquivo `.db` manualmente; o Prisma cria o arquivo na primeira execução (após `prisma db push`), e o volume mantém esse arquivo entre deploys.

---

## 4. Comparação rápida de serviços (por que Hetzner foi escolhido)

| Serviço            | SQLite | Cold start / limite      | Grátis contínuo?     |
|--------------------|--------|---------------------------|----------------------|
| Render             | ✅ (com disk) | Sim, dorme ~15 min        | Sim                  |
| Railway            | ✅     | Não; crédito ~US$ 1/mês   | Quase não            |
| Vercel             | ❌     | N/A (serverless)          | Sim (trocar banco)   |
| Hetzner + EasyPanel| ✅     | Não                       | Não (paga VPS)       |

Conclusão da conversa: **o melhor para este projeto é postar tudo no servidor Hetzner** com EasyPanel.

---

## 5. Plano de execução completo (EasyPanel no Hetzner)

### Fase 1 – Repositório e primeiro deploy

- Código do **site-si** no Git (GitHub/GitLab): `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json`, `prisma/`, `app/`, `components/`, `lib/`, etc. **Não** commitar `.env` nem `*.db`.
- No EasyPanel: **Create / New App** → **Deploy from Git**.
  - **Repository URL:** URL do repositório.
  - **Branch:** `main` (ou a usada).
  - **Build Context:** se o repo for só o site-si → `.`; se for monorepo → ex.: `projetos/solucoes-inteligentes/site-si`.
  - **Dockerfile path:** se repo só site-si → `Dockerfile`; se monorepo → ex.: `projetos/solucoes-inteligentes/site-si/Dockerfile`.
  - **Port:** `3000`.

### Fase 2 – Variáveis de ambiente

No app no EasyPanel, em **Environment Variables**:

| Nome | Valor | Obrigatório |
|------|--------|-------------|
| `DATABASE_URL` | `file:/app/data/si.db` | Sim |
| `JWT_SECRET` | String longa e aleatória (≥ 32 caracteres). Gerar com: `openssl rand -base64 32` | Sim |
| `NEXT_PUBLIC_APP_URL` | URL final do site (ex.: `https://site-si.seudominio.com` ou a URL que o EasyPanel gerar) | Recomendado |

Porta do container: **3000**. Domínio próprio é opcional (configurar no EasyPanel/proxy e usar em `NEXT_PUBLIC_APP_URL`).

### Fase 3 – Volume e primeiro acesso

- **Volumes:** no app, adicionar volume com **Container path** ` /app/data`, **Volume name** ex. `site-si-data`.
- **Deploy:** clicar em Deploy/Build, aguardar status **Running**.
- **Seed (primeiro usuário e categorias):**
  - **Opção A (recomendada):** se o EasyPanel permitir comando de start customizado **uma vez**, usar:
    - `sh -c "npx prisma db push --accept-data-loss 2>/dev/null || true && npx tsx prisma/seed.ts && npm start"`
  - Depois do primeiro deploy, **remover** esse comando e deixar o start padrão (ex.: `npm start`).
  - **Opção B:** se houver Shell/Console no container, rodar:
    - `npx prisma db push --accept-data-loss`
    - `npx tsx prisma/seed.ts`
  - e reiniciar o app.
- O seed cria: usuário `dono@solucoesinteligentes.com` / senha `senha123` e categorias padrão. **Trocar a senha no primeiro login.**
- Testar: abrir a URL do site, acessar `/login`, conferir dashboard, clientes e novo serviço.

### Fase 4 – Atualizações

- Desenvolver localmente → commit e **push** na branch configurada no EasyPanel → no EasyPanel: **Redeploy / Build**.
- O volume em `/app/data` é mantido; o banco não é apagado.
- Antes do push: não commitar `.env` nem `*.db`; rodar `npm run build` na pasta `site-si` para garantir que o build passa.

---

## 6. Tabela de referência rápida

| Item | Valor / Ação |
|------|------------------|
| Build | Dockerfile na raiz do site-si (ou path no monorepo) |
| Porta | 3000 |
| Volume | `/app/data` → nome ex.: `site-si-data` |
| `DATABASE_URL` | `file:/app/data/si.db` |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | URL pública do site |
| Primeiro usuário (seed) | `dono@solucoesinteligentes.com` / `senha123` (trocar depois) |
| Atualizar site | Push na branch → Redeploy no EasyPanel |

---

## 7. Arquivos de referência no repositório

- **Plano detalhado:** `PLANO-EXECUCAO-DEPLOY-SITE-SI.md`
- **Deploy EasyPanel (passo a passo):** `site-si/DEPLOY-EASYPANEL.md`
- **Opções online (Render, Railway, Vercel):** `site-si/DEPLOY-ONLINE.md`
- **Limitações dos serviços:** `site-si/LIMITACOES-SERVICOS-DEPLOY.md`

---

## 8. Instrução para a outra IA

Use este documento como contexto. O usuário quer ajuda para **criar/configurar o deploy do Site SI no servidor Hetzner** onde o **EasyPanel já está instalado**. Siga as fases 1–4 acima (repositório, variáveis, volume, seed, atualizações). Se precisar de detalhes de tela do EasyPanel ou do Dockerfile, consulte `site-si/DEPLOY-EASYPANEL.md` e `site-si/Dockerfile` no projeto.
