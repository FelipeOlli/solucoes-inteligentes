# Banco de dados: implantação e crescimento da operação

Este documento orienta a **implantação do PostgreSQL** em produção e como evoluir o banco à medida que você aumentar a operação e quiser **deixar tudo registrado** no site.

---

## 1. Situação atual

O site já está preparado para PostgreSQL:

- **Prisma** com `provider = "postgresql"` em `prisma/schema.prisma`.
- **Migrações** em `prisma/migrations` (tabelas criadas no Postgres).
- **Deploy:** o Dockerfile roda `prisma migrate deploy` e o seed na subida do container.

Hoje o modelo cobre:

- **Usuários** (dono e equipe): login e gestão.
- **Clientes:** nome, e-mail, telefone, endereço.
- **Serviços:** código, status, datas, valor estimado, notas, histórico de status.
- **Categorias de serviço** e **tokens** para o cliente acompanhar o serviço.

Para **implantar** o banco em produção: siga **[POSTGRES-EASYPANEL.md](POSTGRES-EASYPANEL.md)** (criar serviço Postgres no EasyPanel, configurar `DATABASE_URL` no app, redeploy).

---

## 2. Backups (PostgreSQL)

Com o banco em um serviço separado (Postgres no EasyPanel), é essencial ter **backups** para não perder dados ao crescer a operação.

- **EasyPanel:** verifique se o template Postgres ou o painel oferece backup agendado (volumes, snapshots). Use se existir.
- **Manual (recomendado como mínimo):** de dentro do servidor ou de um job agendado, rode algo como:
  ```bash
  pg_dump -h sidb -U root -d sintel -F c -f backup_$(date +%Y%m%d).dump
  ```
  Guarde o arquivo `.dump` em outro disco ou nuvem (ex.: S3, outro servidor). Agende (cron) para rodar diariamente ou semanalmente.
- **Restaurar:** `pg_restore -h sidb -U root -d sintel -c backup_YYYYMMDD.dump` (ajuste host/usuário/banco conforme seu ambiente).

Assim você mantém tudo registrado mesmo em caso de falha do servidor ou do container.

---

## 3. Ideias para “deixar tudo registrado” no futuro

Conforme aumentar a operação, você pode estender o modelo do Prisma e as APIs para registrar mais coisas. Sugestões (sem implementação aqui, só direção):

| Área | O que registrar | Exemplo de uso |
|------|------------------|----------------|
| **Financeiro** | Pagamentos recebidos, custos por serviço, forma de pagamento | Relatório de faturamento, custos por categoria |
| **Orçamentos** | Versões de orçamento (valores, itens, aceite do cliente) | Histórico de orçamentos e conversão em serviço |
| **Atividades / log** | Quem fez o quê e quando (alteração de serviço, de cliente, login) | Auditoria e suporte |
| **Agenda** | Agendamentos vinculados a serviços ou blocos de tempo | Calendário da equipe e do cliente |
| **Documentos** | Anexos por serviço ou cliente (contratos, fotos oficiais) | Tudo vinculado ao serviço no site |
| **Relatórios** | Consultas salvas ou dashboards (quantidade de serviços por período, por categoria, por status) | Decisão com base em dados |

Cada uma dessas áreas pode virar novas tabelas no `schema.prisma`, novas migrações e novas rotas/APIs. O importante é manter **uma única fonte de verdade** (o PostgreSQL) e backups regulares.

---

## 4. Resumo

1. **Implantar o banco:** use PostgreSQL no EasyPanel conforme [POSTGRES-EASYPANEL.md](POSTGRES-EASYPANEL.md) e [DEPLOY-EASYPANEL.md](../DEPLOY-EASYPANEL.md).
2. **Backups:** configure pelo menos um backup periódico (pg_dump + cópia para outro lugar).
3. **Crescimento:** estenda o schema (Prisma) e as APIs conforme for precisar de financeiro, orçamentos, auditoria, agenda, documentos e relatórios — tudo registrado no mesmo banco.

Se quiser, no próximo passo podemos desenhar uma dessas extensões (por exemplo financeiro ou orçamentos) em tabelas e rotas concretas.
