# Playbook de Projetos no EasyPanel

Documento-base para padronizar deploy, operação e evolução de qualquer projeto no EasyPanel, usando o projeto **Site SI** como referência funcional.

## 1) Objetivo do playbook

Garantir que novos projetos tenham:

- processo previsível de deploy;
- critérios de qualidade antes do push;
- configuração segura de ambiente;
- rotina de rollback e suporte pós-deploy;
- baixa dependência de pessoa (qualquer membro consegue operar).

## 2) Princípios de processo

- **Build reproduzível**: o mesmo comando local deve funcionar em produção (`npm run build`).
- **Ambiente explícito**: nada crítico “implícito”; variáveis e dependências documentadas.
- **Banco com migração versionada**: toda mudança de schema vai junto no Git.
- **Gate local antes do push**: código só sobe após checklist obrigatório.
- **Deploy observável**: logs e status com sinais claros de sucesso/falha.
- **Rollback possível**: estratégia pronta antes de publicar.

## 3) Estrutura mínima recomendada no repositório

Para projetos Node/Next semelhantes a este:

- `Dockerfile`
- `.dockerignore`
- `package.json`
- `prisma/schema.prisma` (se usar Prisma)
- `prisma/migrations/*`
- `.env.example`
- `docs/` com guias de deploy/operação

No monorepo, definir claramente:

- **Build Context** (ex.: `site-si`)
- **Dockerfile path** (ex.: `Dockerfile` dentro do contexto)

## 4) Checklist obrigatório local (antes do push)

Use este bloco em **todo** projeto novo.

### 4.1 Preparação local

1. Confirmar versão de runtime (Node/LTS do projeto).
2. Instalar dependências:
   - `npm install`
3. Validar variáveis locais mínimas (arquivo `.env`).

### 4.2 Qualidade técnica

1. Rodar lint (quando existir):
   - `npm run lint`
2. Rodar testes (quando existirem):
   - `npm test`
3. Rodar build de produção:
   - `npm run build`

### 4.3 Banco de dados

1. Se houve alteração de schema:
   - gerar/validar migration
   - revisar SQL de migration
2. Testar aplicação com schema novo localmente.
3. Garantir que migration está versionada no Git.

### 4.4 Segurança e configuração

1. Confirmar que segredos não entraram no commit.
2. Atualizar `.env.example` com novas variáveis obrigatórias.
3. Atualizar documentação de deploy/operação quando necessário.

### 4.5 Gate final para push

Só fazer push quando:

- build local passou;
- migrations revisadas;
- docs atualizadas;
- sem arquivos duplicados/temporários no `git status`.

## 5) Template de variáveis de ambiente (produção)

Use como modelo e adapte por projeto.

| Categoria | Variável | Obrigatória | Exemplo |
|---|---|---|---|
| App | `NEXT_PUBLIC_APP_URL` | Sim | `https://seu-dominio.com` |
| Segurança | `JWT_SECRET` | Sim | chave forte com 32+ chars |
| Banco | `DATABASE_URL` | Sim | `postgresql://user:senha@db:5432/appdb` |
| Integração OAuth | `GOOGLE_CLIENT_ID` | Condicional | id OAuth |
| Integração OAuth | `GOOGLE_CLIENT_SECRET` | Condicional | secret OAuth |
| Integração OAuth | `GOOGLE_REDIRECT_URI` | Condicional | `https://dominio/api/.../callback` |

**Regra**: caracteres especiais em senha do `DATABASE_URL` devem ser URL-encoded (ex.: `@` -> `%40`).

## 6) Padrão de deploy no EasyPanel

### 6.1 Configuração do serviço

1. Criar serviço **App** (Deploy from Git).
2. Informar:
   - repositório e branch;
   - build context;
   - dockerfile path;
   - porta do container (ex.: `3000`).
3. Definir variáveis de ambiente.
4. Configurar domínio e SSL.

### 6.2 Banco (recomendação)

- Produção: **PostgreSQL em serviço separado**.
- Evitar SQLite para cenários com crescimento, concorrência e integrações.

### 6.3 Sequência segura de release

1. Aplicar deploy com migration.
2. Validar health checks e logs.
3. Executar smoke tests de rotas críticas.
4. Liberar uso para operação.

## 7) Smoke test pós-deploy (padrão)

Executar em toda publicação:

1. Login com perfil administrativo.
2. CRUD principal do domínio (ex.: serviço/cliente).
3. Fluxo sensível (ex.: status, anexos, agenda).
4. Integrações externas (ex.: Google Calendar/OAuth).
5. Validar timezone e datas em telas principais.

## 8) Rollback e contingência

### 8.1 Quando rollback é necessário

- erro de build em produção;
- migration com impacto não esperado;
- falha crítica em login, dados ou integrações.

### 8.2 Procedimento

1. Identificar último commit estável.
2. Re-deploy desse commit no EasyPanel.
3. Se migration foi destrutiva, executar plano de recuperação de banco.
4. Registrar incidente e ação corretiva.

## 9) Operação contínua

- Monitorar:
  - falhas de build/deploy;
  - erros de aplicação;
  - integrações externas (webhooks/tokens expiram).
- Estabelecer rotina:
  - backup de banco;
  - revisão de segredos;
  - atualização de dependências.

## 10) Modelo de “Definition of Done” para release

Uma release só está pronta quando:

- código builda localmente e no EasyPanel;
- migration aplicada com sucesso;
- checklist local antes do push foi cumprido;
- smoke test pós-deploy foi concluído;
- documentação de operação foi atualizada.

## 11) Anexo rápido: comandos padrão (Node/Next + Prisma)

```bash
# 1) Instalar
npm install

# 2) Lint/Test/Build
npm run lint
npm test
npm run build

# 3) Prisma (se aplicável)
npx prisma generate
npx prisma migrate deploy

# 4) Verificação Git
git status
```

## 12) Como usar este documento em novos projetos

1. Copie este playbook para `docs/PLAYBOOK-EASYPANEL-PROJETOS.md`.
2. Ajuste:
   - stack técnica;
   - variáveis de ambiente;
   - smoke tests do domínio;
   - estratégia de rollback específica.
3. Mantenha o bloco de **Checklist obrigatório local antes do push** sem remoções.

