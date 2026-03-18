# Deploy do Site SI no EasyPanel (Hetzner)

Passo a passo para publicar o site Soluções Inteligentes em um servidor Hetzner com EasyPanel.

**Banco de dados (recomendado para produção e crescimento):** use **PostgreSQL** em um serviço separado no EasyPanel. O site já está preparado (Prisma + migrações). Guia completo: **[docs/POSTGRES-EASYPANEL.md](docs/POSTGRES-EASYPANEL.md)**. Resumo: criar serviço Postgres (ex.: `sidb`), definir `DATABASE_URL` no app e remover o volume `/app/data` do app. Para pensar em backups e evolução do banco: **[docs/BANCO-CRESCIMENTO.md](docs/BANCO-CRESCIMENTO.md)**.

**Alternativa simples:** SQLite com volume em `/app/data` (um único serviço; adequado para testes ou uso leve).

Para um processo reutilizável em projetos futuros (incluindo validação local antes do push), use também o playbook: **[docs/PLAYBOOK-EASYPANEL-PROJETOS.md](docs/PLAYBOOK-EASYPANEL-PROJETOS.md)**.

---

## 1. O que você precisa

- Servidor Hetzner com EasyPanel instalado e acesso ao painel
- Código do site em um repositório Git (GitHub, GitLab, etc.) **ou** possibilidade de fazer upload do projeto
- Domínio (opcional) para apontar para o servidor

---

## 2. Preparar o repositório

Certifique-se de que na raiz do projeto **site-si** existam:

- `Dockerfile`
- `.dockerignore`
- `package.json` e demais arquivos do Next.js

Se usar Git, faça push desses arquivos para o repositório.

---

## 3. No EasyPanel

### 3.1 Criar novo App

1. Acesse o painel do EasyPanel no seu servidor (ex.: `https://seu-servidor:3000`).
2. Clique em **Create** ou **New App**.
3. Escolha **Deploy from Git** (se o código estiver no Git) ou **Deploy from Dockerfile** (se for enviar o projeto manualmente).

### 3.2 Configurar repositório (se usar Git)

- **Repository URL:** URL do repositório (ex.: `https://github.com/seu-usuario/site-si.git`).
- **Branch:** `main` ou a branch que você usa.
- **Build Context:** raiz do repositório **ou** a pasta onde está o `Dockerfile` (ex.: `site-si` se o repositório for o projeto todo).
- **Dockerfile path:** `site-si/Dockerfile` se o repositório for a raiz do monorepo; ou `Dockerfile` se o repositório for só o site-si.

Se o repositório contém só o site-si (pasta raiz = site-si):

- Build Context: `.` (raiz)
- Dockerfile path: `Dockerfile`

### 3.3 Variáveis de ambiente (Environment Variables)

Adicione no painel do app:

| Nome | Valor | Obrigatório |
|------|--------|-------------|
| `DATABASE_URL` | **PostgreSQL (recomendado):** `postgresql://user:senha@sidb:5432/sintel` — veja [docs/POSTGRES-EASYPANEL.md](docs/POSTGRES-EASYPANEL.md). **SQLite:** `file:/app/data/si.db` | Sim |
| `JWT_SECRET` | Uma chave longa e aleatória (mín. 32 caracteres) | Sim |
| `NEXT_PUBLIC_APP_URL` | URL final do site (ex.: `https://solucoesinteligentes.com.br`) | Recomendado |
| `GOOGLE_CLIENT_ID` | Client ID do OAuth 2.0 (Google Cloud Console) | Se usar agenda Google |
| `GOOGLE_CLIENT_SECRET` | Client Secret do OAuth 2.0 | Se usar agenda Google |
| `GOOGLE_REDIRECT_URI` | Ex.: `https://seu-dominio.com/api/integrations/google-calendar/callback` | Se usar agenda Google |

**Exemplo de JWT_SECRET:** gere uma string aleatória (ex.: `openssl rand -base64 32`) e use o resultado.

### 3.4 Porta

- **Port:** `3000` (o app Next.js usa 3000 por padrão).
- No EasyPanel, normalmente você informa a porta do container (3000) e o EasyPanel faz o proxy/reverso.

### 3.5 Volume (apenas se usar SQLite)

Se você optou por **SQLite** (`DATABASE_URL=file:/app/data/si.db`), para o banco não sumir ao reiniciar o app:

1. Em **Volumes** ou **Storage** do app, adicione um volume.
2. **Container path:** `/app/data`
3. **Volume name:** por exemplo `site-si-data` (pode ser qualquer nome).

Assim o arquivo `si.db` fica em `/app/data/si.db` e é mantido entre deploys/reinícios. **Se usar PostgreSQL**, não é necessário volume no app para o banco (os dados ficam no serviço Postgres).

### 3.6 Deploy

1. Salve a configuração e clique em **Deploy** / **Build**.
2. Aguarde o build (pode levar alguns minutos).
3. Quando o status ficar “Running”, o site estará no ar na URL que o EasyPanel mostrar (ex.: `https://site-si.seudominio.com` ou a que você configurou).

Se usar integração de agenda Google, veja também o checklist de ativação em `docs/GOOGLE-AGENDA-ROLLOUT.md`.

---

## 4. Primeiro acesso

- **URL:** a que o EasyPanel exibir para o app (ou o domínio que você apontou).
- **Minha área:** acesse `/login`. O **seed roda automaticamente** na subida do container (Dockerfile): se o banco estiver vazio, o usuário **dono@solucoesinteligentes.com** (senha: **senha123**) é criado; se já existir, nada muda. Assim o login funciona logo após o deploy e **também após reiniciar o servidor**. Se ainda falhar, veja `CHECKLIST-TOKEN-LOGIN.md` (variáveis, volume, redeploy).

---

## 5. Resumo rápido

| O quê | Onde / Valor |
|-------|------------------|
| Build | Dockerfile na raiz do site-si |
| Porta do app | 3000 |
| **PostgreSQL (recomendado)** | Serviço Postgres (ex.: `sidb`) + `DATABASE_URL=postgresql://...` no app; sem volume no app. Ver [docs/POSTGRES-EASYPANEL.md](docs/POSTGRES-EASYPANEL.md) |
| **SQLite** | `DATABASE_URL=file:/app/data/si.db` + volume `/app/data` |
| `JWT_SECRET` | Chave forte (≥ 32 caracteres) |
| `NEXT_PUBLIC_APP_URL` | URL pública do site |
| `GOOGLE_*` | Credenciais OAuth para sincronização com Google Agenda |

---

## 6. Atualizar o site depois

- **Deploy from Git:** faça push das alterações na branch configurada e clique em **Redeploy** / **Build** no EasyPanel.
- Com **PostgreSQL**, os dados ficam no serviço do banco. Com **SQLite**, o volume em `/app/data` é mantido entre deploys.

### 6.1 Deploy automático ao dar push (opcional)

Para não precisar clicar em Redeploy no EasyPanel a cada push:

1. **Token do GitHub no EasyPanel**
   - No EasyPanel: **Settings** → **GitHub**.
   - Crie um **Personal Access Token** no GitHub (em GitHub → Settings → Developer settings → Personal access tokens).
   - Permissões sugeridas: repositório com acesso de leitura e, se o EasyPanel pedir, **Webhooks** (read and write) para o auto-deploy.
   - Cole o token no EasyPanel e salve.

2. **Ativar Auto Deploy no app**
   - Abra o **app do Site SI** no EasyPanel.
   - Nas configurações do serviço (Code source / Git ou equivalente), ative a opção **Auto Deploy**.
   - O EasyPanel passa a registrar um webhook no seu repositório no GitHub.

Depois disso, cada **push na branch configurada** (ex.: `main`) dispara o build e o redeploy automaticamente. Com SQLite, o volume em `/app/data` continua sendo mantido entre deploys.

---

Se quiser, no próximo passo podemos: ajustar o Dockerfile para o seu repositório (monorepo ou só site-si) ou montar o comando/seed para criar o primeiro usuário em produção.
