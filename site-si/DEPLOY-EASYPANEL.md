# Deploy do Site SI no EasyPanel (Hetzner)

Passo a passo para publicar o site Soluções Inteligentes em um servidor Hetzner com EasyPanel.

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
| `DATABASE_URL` | `file:/app/data/si.db` | Sim |
| `JWT_SECRET` | Uma chave longa e aleatória (mín. 32 caracteres) | Sim |
| `NEXT_PUBLIC_APP_URL` | URL final do site (ex.: `https://solucoesinteligentes.com.br`) | Recomendado |

**Exemplo de JWT_SECRET:** gere uma string aleatória (ex.: `openssl rand -base64 32`) e use o resultado.

### 3.4 Porta

- **Port:** `3000` (o app Next.js usa 3000 por padrão).
- No EasyPanel, normalmente você informa a porta do container (3000) e o EasyPanel faz o proxy/reverso.

### 3.5 Volume (persistir o banco SQLite)

Para o banco não sumir ao reiniciar o app:

1. Em **Volumes** ou **Storage** do app, adicione um volume.
2. **Container path:** `/app/data`
3. **Volume name:** por exemplo `site-si-data` (pode ser qualquer nome).

Assim o arquivo `si.db` fica em `/app/data/si.db` e é mantido entre deploys/reinícios.

### 3.6 Deploy

1. Salve a configuração e clique em **Deploy** / **Build**.
2. Aguarde o build (pode levar alguns minutos).
3. Quando o status ficar “Running”, o site estará no ar na URL que o EasyPanel mostrar (ex.: `https://site-si.seudominio.com` ou a que você configurou).

---

## 4. Primeiro acesso

- **URL:** a que o EasyPanel exibir para o app (ou o domínio que você apontou).
- **Área do dono:** acesse `/login`. O primeiro usuário precisa existir no banco:
  - Se você tiver **seed**, rode o seed uma vez (pode ser em um job temporário no EasyPanel ou localmente apontando para o mesmo arquivo de banco, se tiver acesso).
  - Ou crie o usuário manualmente via Prisma/script se tiver como executar no servidor.

Se ainda não tiver seed rodando em produção, posso te ajudar a descrever um comando ou job único para “rodar seed no primeiro deploy”.

---

## 5. Resumo rápido

| O quê | Onde / Valor |
|-------|------------------|
| Build | Dockerfile na raiz do site-si |
| Porta do app | 3000 |
| Volume | `/app/data` (persistir SQLite) |
| `DATABASE_URL` | `file:/app/data/si.db` |
| `JWT_SECRET` | Chave forte (≥ 32 caracteres) |
| `NEXT_PUBLIC_APP_URL` | URL pública do site |

---

## 6. Atualizar o site depois

- **Deploy from Git:** faça push das alterações na branch configurada e clique em **Redeploy** / **Build** no EasyPanel.
- O volume em `/app/data` é mantido, então o banco (e usuários/dados) permanecem.

Se quiser, no próximo passo podemos: ajustar o Dockerfile para o seu repositório (monorepo ou só site-si) ou montar o comando/seed para criar o primeiro usuário em produção.
