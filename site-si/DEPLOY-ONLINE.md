# Colocar o Site SI online – opções

O site é **Next.js + Prisma (SQLite)**. Para acesso de qualquer lugar você pode usar uma destas opções.

---

## Opção 1: Railway (recomendado – rápido e simples)

**Vantagens:** Deploy por Git, volume para SQLite, plano gratuito, URL pública na hora.

1. **Crie uma conta:** [railway.app](https://railway.app) (pode usar login com GitHub).

2. **Novo projeto a partir do repositório:**
   - Coloque o código do **site-si** em um repositório no GitHub (pode ser só a pasta `site-si` ou o monorepo).
   - No Railway: **New Project** → **Deploy from GitHub repo** → selecione o repositório.
   - **Root Directory:** se o repositório for o monorepo, use `projetos/solucoes-inteligentes/site-si` (ou o caminho onde está o `site-si`). Se o repo for só o site-si, deixe em branco.

3. **Configurar como Docker:**
   - No serviço criado: **Settings** → **Build** → **Builder**: **Dockerfile**.
   - **Dockerfile path:** `Dockerfile` (ou `site-si/Dockerfile` se o root for o monorepo).

4. **Variáveis de ambiente** (Settings → Variables):

   | Nome | Valor |
   |------|--------|
   | `DATABASE_URL` | `file:/app/data/si.db` |
   | `JWT_SECRET` | Uma chave longa (mín. 32 caracteres). Ex.: gere com `openssl rand -base64 32` |
   | `NEXT_PUBLIC_APP_URL` | Deixe em branco primeiro; depois preencha com a URL que o Railway der (ex.: `https://seu-app.up.railway.app`) |

5. **Volume (persistir o banco):**
   - **Settings** → **Volumes** → **Add Volume**.
   - **Mount Path:** `/app/data`.

6. **Domínio público:**
   - **Settings** → **Networking** → **Generate Domain**. O Railway gera uma URL tipo `https://xxx.up.railway.app`.
   - Depois de gerar, atualize `NEXT_PUBLIC_APP_URL` com essa URL e faça **Redeploy**.

7. **Primeiro usuário (seed):**
   - Após o primeiro deploy, em **Settings** → **Deploy** você pode rodar um comando único:
     - **Command override** (uma vez): `npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts && npm start`
     - Ou use o **Console** do serviço (se disponível) e rode: `npx tsx prisma/seed.ts`.

Pronto: o site fica em `https://xxx.up.railway.app`. Login em `/login`.

---

## Opção 2: Render

**Vantagens:** Plano gratuito, deploy por Git, suporta Docker e disco persistente.

1. **Conta:** [render.com](https://render.com).

2. **New** → **Web Service** → conecte o repositório GitHub.

3. **Configuração:**
   - **Environment:** Docker.
   - **Root Directory:** se for monorepo, a pasta onde está o `site-si` (ex.: `projetos/solucoes-inteligentes/site-si`).

4. **Environment Variables:**

   | Nome | Valor |
   |------|--------|
   | `DATABASE_URL` | `file:/app/data/si.db` |
   | `JWT_SECRET` | Chave longa (≥ 32 caracteres) |
   | `NEXT_PUBLIC_APP_URL` | URL que o Render der (ex.: `https://seu-servico.onrender.com`) — pode ajustar depois |

5. **Persistent Disk (para o SQLite):**
   - Na criação do Web Service, em **Advanced** adicione **Persistent Disk**.
   - **Mount Path:** `/app/data`.

6. **Build/Start:** o Render usa o `Dockerfile` da pasta do serviço. Porta **3000**.

7. **Seed:** após o primeiro deploy, em **Shell** (se disponível) rode:  
   `npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts`  
   Depois reinicie o serviço.

O site ficará em `https://seu-servico.onrender.com`.

---

## Opção 3: EasyPanel no Hetzner (servidor seu)

Se você já tem ou quiser um VPS na Hetzner (ou outro provedor) com EasyPanel instalado, use o passo a passo completo em **[DEPLOY-EASYPANEL.md](./DEPLOY-EASYPANEL.md)**.

Resumo: criar app no EasyPanel, apontar para o Git ou Dockerfile, configurar `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, volume em `/app/data`, porta 3000.

---

## Checklist antes de qualquer deploy

- [ ] Código do **site-si** em um repositório Git (GitHub/GitLab).
- [ ] `Dockerfile` e `package-lock.json` na pasta que será o build (raiz do repo ou subpasta configurada).
- [ ] Variáveis definidas: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` (esta última com a URL final após gerar o domínio).
- [ ] Volume ou disco persistente em `/app/data` para o SQLite.
- [ ] Rodar seed (ou criar o primeiro usuário) após o primeiro deploy.

---

## Resumo rápido

| Onde | Esforço | Custo | Observação |
|------|---------|--------|------------|
| **Railway** | Baixo | Plano gratuito limitado | Bom para colocar no ar rápido. |
| **Render** | Baixo | Plano gratuito (serviço pode “dormir”) | Acordar pode levar alguns segundos. |
| **EasyPanel (Hetzner)** | Médio | Você paga o VPS | Controle total; ver DEPLOY-EASYPANEL.md. |

Se quiser, no próximo passo podemos: (1) preparar o repositório só com a pasta `site-si` para subir no GitHub, ou (2) detalhar a Opção 1 (Railway) passo a passo na sua tela.
