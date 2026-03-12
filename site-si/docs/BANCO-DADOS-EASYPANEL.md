# Melhor opção de banco de dados no EasyPanel

Para o **Site Soluções Inteligentes** (Next.js + Prisma), considerando o que o EasyPanel oferece, a recomendação é:

---

## Recomendação: **PostgreSQL**

| Critério | PostgreSQL | MySQL/MariaDB | SQLite (atual) |
|----------|------------|----------------|----------------|
| Suporte no EasyPanel | ✅ Nativo (templates, backups) | ✅ Nativo | ✅ Via volume no app |
| Prisma | ✅ Excelente | ✅ Muito bom | ✅ Bom |
| Persistência | ✅ Serviço dedicado, não depende de volume do app | ✅ Idem | ⚠️ Depende do volume em `/app/data` |
| Múltiplas instâncias do app | ✅ Várias réplicas usam o mesmo banco | ✅ Idem | ❌ Um arquivo por instância |
| Backup / restauração | ✅ Ferramentas do EasyPanel | ✅ Idem | Manual (copiar arquivo) |
| Open source | ✅ 100% | MariaDB ✅ / MySQL depende | ✅ |

**Por que PostgreSQL em primeiro lugar:**
- Banco separado do app: reiniciar o backend não mexe no banco; não há confusão entre “Storage” e “DATABASE_URL”.
- Suporte muito bom no Prisma e na comunidade Next.js.
- EasyPanel trata Postgres como cidadão de primeira classe (backups, interface).
- Escala melhor se no futuro você tiver mais de uma instância do site.

**Quando manter SQLite:** servidor único, poucos acessos, você já está confortável com o volume em `/app/data` e não quer gerenciar outro serviço. Continua válido.

---

## Como usar PostgreSQL no EasyPanel

### 1. Criar o serviço PostgreSQL no EasyPanel

1. No EasyPanel: **Create** → escolha o template **PostgreSQL** (ou “Database” / “Postgres”).
2. Defina um nome (ex.: `sintel-db` ou `postgres`).
3. Configure **variáveis de ambiente** que o template pedir (ex.: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`). Use uma senha forte e anote.
4. **Storage:** o template normalmente já sugere um volume para os dados do Postgres; mantenha para persistência.
5. Deixe o Postgres na **mesma rede** que o app (no EasyPanel isso costuma ser automático para serviços do mesmo projeto).

### 2. Obter a URL de conexão

- **Host:** nome do serviço no EasyPanel (ex.: `sintel-db` ou `postgres`).
- **Porta:** geralmente `5432`.
- **Formato:**  
  `postgresql://USUARIO:SENHA@NOME_DO_SERVICO:5432/NOME_DO_BANCO`

Exemplo:  
`postgresql://si_user:MinHaS3nhaF0rte@sintel-db:5432/si`

### 3. Configurar o app (backend) do Site SI

- No serviço **backend** do Site SI, em **Environment**, defina:
  - **DATABASE_URL** = a URL acima (uma única linha, sem aspas no painel se não for necessário).
- **Remova** ou não use mais o volume `/app/data` para o banco (o banco fica no container do Postgres).
- Redeploy do backend.

### 4. Ajustar o projeto para PostgreSQL

No repositório do site (para o próximo deploy):

- No **Prisma:** trocar o `schema.prisma` de `provider = "sqlite"` para `provider = "postgresql"` e usar a mesma `url = env("DATABASE_URL")`.
- Rodar **migrações** (ex.: `npx prisma migrate deploy`) no primeiro deploy com Postgres; o seed pode continuar rodando no startup como hoje.

Guia passo a passo com a **configuração no EasyPanel** e a **DATABASE_URL** exata: **`docs/POSTGRES-EASYPANEL.md`**.

---

## Resumo

- **Melhor opção no EasyPanel para este app:** **PostgreSQL** (banco separado, persistência clara, bons backups e Prisma).
- **Alternativa válida:** **MySQL/MariaDB** se você ou sua equipe tiverem mais experiência com eles; o EasyPanel também oferece suporte.
- **SQLite + volume** segue adequado se você quiser manter um único serviço e já tiver o volume e o seed automático configurados.

Se quiser, no próximo passo podemos fazer a migração do projeto de SQLite para PostgreSQL (alterações no Prisma e no deploy).
