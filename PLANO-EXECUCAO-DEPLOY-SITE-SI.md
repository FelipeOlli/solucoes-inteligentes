# Plano de execução – Site SI online (Hetzner + EasyPanel)

**Objetivo:** Site Soluções Inteligentes no ar, totalmente funcional, com atualizações fáceis via Git.  
**Ambiente:** Servidor Hetzner com EasyPanel instalado.  
**Referência técnica:** `site-si/DEPLOY-EASYPANEL.md`

---

## Visão geral

| Fase | O quê | Resultado |
|------|--------|------------|
| **1** | Repositório e primeiro deploy | Código no Git, app criado no EasyPanel, build e volume configurados |
| **2** | Variáveis e rede | DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL, porta 3000, domínio (opcional) |
| **3** | Dados iniciais | Volume em `/app/data`, seed rodado, primeiro acesso ao `/login` |
| **4** | Fluxo de atualizações | Push → Redeploy no EasyPanel, sem perda de banco |

O **master-orchestrator** (`.aios-core/core/orchestration/master-orchestrator.js`) é do motor de desenvolvimento (spec → execução → QA), não do deploy. Este plano é o “orquestrador” do deploy: etapas ordenadas para deixar o site online e manter as atualizações simples.

---

## Fase 1 – Repositório e primeiro deploy

### 1.1 Código no Git

- [ ] Ter o projeto **site-si** versionado (só a pasta `site-si` ou o monorepo).
- [ ] Repositório no GitHub/GitLab com:
  - `Dockerfile`
  - `.dockerignore`
  - `package.json` e `package-lock.json`
  - `prisma/`, `app/`, `components/`, `lib/`, etc.
- [ ] **Não** commitar `.env` nem `*.db`. Manter `.env.example` para referência.

**Se o repositório for o monorepo (ex.: `aios-core-alan-work`):**  
Na hora de criar o app no EasyPanel, informar **Build Context** = pasta onde está o `site-si` (ex.: `projetos/solucoes-inteligentes/site-si`) e **Dockerfile path** = `Dockerfile` (relativo a essa pasta) ou `projetos/solucoes-inteligentes/site-si/Dockerfile` se o EasyPanel usar a raiz do repo.

### 1.2 Criar o app no EasyPanel

1. [ ] Acessar o painel EasyPanel no Hetzner (ex.: `https://IP-DO-SERVIDOR:3000`).
2. [ ] **Create** / **New App**.
3. [ ] **Deploy from Git**:
   - **Repository URL:** `https://github.com/SEU-USUARIO/SEU-REPO.git`
   - **Branch:** `main` (ou a que você usa).
   - **Build Context:**  
     - Repo só com site-si → `.`  
     - Monorepo → ex.: `projetos/solucoes-inteligentes/site-si`
   - **Dockerfile path:**  
     - Repo só site-si → `Dockerfile`  
     - Monorepo → `projetos/solucoes-inteligentes/site-si/Dockerfile` (ou o path que o EasyPanel usar a partir da raiz).
4. [ ] **Port:** `3000`.
5. [ ] Salvar (ainda sem rodar deploy, se quiser fechar variáveis antes).

---

## Fase 2 – Variáveis de ambiente e rede

### 2.1 Variáveis no EasyPanel

No app criado, em **Environment Variables** (ou equivalente):

| Nome | Valor | Obrigatório |
|------|--------|-------------|
| `DATABASE_URL` | `file:/app/data/si.db` | Sim |
| `JWT_SECRET` | String longa e aleatória (≥ 32 caracteres) | Sim |
| `NEXT_PUBLIC_APP_URL` | URL final do site (ex.: `https://site-si.seudominio.com` ou a URL que o EasyPanel gerar) | Recomendado |

**Gerar JWT_SECRET (no seu Mac):**
```bash
openssl rand -base64 32
```
Copiar o resultado e colar no valor de `JWT_SECRET`.

**NEXT_PUBLIC_APP_URL:** no primeiro deploy pode usar a URL que o EasyPanel atribuir ao app; depois troque para o domínio definitivo, se tiver.

### 2.2 Porta e domínio

- [ ] Porta do container: **3000** (já usada no Dockerfile).
- [ ] (Opcional) Domínio próprio: no painel do EasyPanel / proxy reverso, apontar o domínio para este app e usar essa URL em `NEXT_PUBLIC_APP_URL`.

---

## Fase 3 – Volume e primeiro acesso

### 3.1 Volume para o SQLite

- [ ] No app, em **Volumes** / **Storage**:
  - **Container path:** `/app/data`
  - **Volume name:** ex. `site-si-data`
- [ ] Salvar. Assim o arquivo `si.db` ficará em `/app/data/si.db` e não será perdido em redeploy/restart.

### 3.2 Primeiro deploy

- [ ] Clicar em **Deploy** / **Build**.
- [ ] Aguardar o build (pode levar alguns minutos).
- [ ] Status **Running** → app no ar na URL configurada.

### 3.3 Rodar o seed (primeiro usuário e categorias)

O seed cria:
- Usuário dono: `dono@solucoesinteligentes.com` / `senha123`
- Categorias de serviço padrão.

**Opção A – Comando único no primeiro deploy (recomendado)**  
Se o EasyPanel permitir sobrescrever o comando de start **uma vez**:

- **Custom start command (uma vez):**  
  `sh -c "npx prisma db push --accept-data-loss 2>/dev/null || true && npx tsx prisma/seed.ts && npm start"`

Depois do primeiro deploy bem-sucedido, remover o comando customizado e deixar o padrão do Dockerfile (ou só `npm start`), para os próximos deploys não rodarem seed de novo.

**Opção B – Shell/Console do EasyPanel**  
Se houver **Shell** ou **Console** no container:

```bash
npx prisma db push --accept-data-loss
npx tsx prisma/seed.ts
```

Depois reiniciar o app. O volume já estará montado; o seed roda uma vez e o usuário fica persistido.

**Opção C – Local apontando para o mesmo banco**  
Se você tiver acesso ao volume do servidor (SSH + caminho do volume), pode rodar o seed localmente com `DATABASE_URL` apontando para esse arquivo (avançado).

- [ ] Seed executado com sucesso.
- [ ] Trocar a senha do dono no primeiro login (recomendado).

### 3.4 Testar acesso

- [ ] Abrir a URL do site no navegador.
- [ ] Acessar `/login` e entrar com `dono@solucoesinteligentes.com` / `senha123`.
- [ ] Conferir dashboard, clientes, novo serviço e link para cliente.

---

## Fase 4 – Atualizações (subir alterações com facilidade)

### 4.1 Fluxo de atualização

1. [ ] Desenvolver e testar localmente (ex.: `npm run dev`).
2. [ ] Commit e push para a branch configurada no EasyPanel (ex.: `main`).
3. [ ] No EasyPanel: **Redeploy** / **Build** no app do Site SI.
4. [ ] Aguardar build e status **Running**.

O volume em `/app/data` é mantido entre deploys; o banco e os dados não são apagados.

### 4.2 Checklist rápido antes de cada push

- [ ] Não commitar `.env` nem `*.db`.
- [ ] Build local ok: `npm run build` na pasta `site-si`.
- [ ] (Opcional) Rodar lint: `npm run lint`.

---

## Resumo – tabela de referência

| Item | Valor / Ação |
|------|------------------|
| Build | Dockerfile na raiz do site-si (ou path no monorepo) |
| Porta | 3000 |
| Volume | `/app/data` → nome ex.: `site-si-data` |
| `DATABASE_URL` | `file:/app/data/si.db` |
| `JWT_SECRET` | Gerar com `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | URL pública do site |
| Primeiro usuário | Rodar seed (comando único ou Shell); login: `dono@solucoesinteligentes.com` / `senha123` |
| Atualizar site | Push na branch → Redeploy no EasyPanel |

---

## Relação com o master-orchestrator

O **master-orchestrator** (`.aios-core/core/orchestration/master-orchestrator.js`) orquestra o **ciclo de desenvolvimento** (Epics 3 → 4 → 6: spec, execução, QA). Ele não faz deploy.

Este plano é o “plano de execução” do **deploy**: etapas ordenadas (repositório → EasyPanel → variáveis → volume → seed → atualizações) para manter o site online e a rotina de “push + redeploy” simples e repetível.

Se quiser automatizar o redeploy (ex.: webhook do GitHub ao dar push), isso pode ser configurado no EasyPanel quando suportado; o fluxo acima continua válido.
