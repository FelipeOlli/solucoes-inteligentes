# Checklist: resolver "E-mail ou senha inválidos" ou "Token ausente ou inválido" no login

Siga na ordem. Depois de cada passo, teste o login em **aba anônima** (ou apague o `si_token` no Local Storage).

**Importante:** desde que o **volume** em `/app/data` esteja configurado, o banco persiste entre restarts. O **seed roda automaticamente** na subida do container (Dockerfile): se o banco estiver vazio, o usuário dono é criado; se já existir, nada é alterado. Assim o login volta a funcionar mesmo após reiniciar o servidor.

---

## 1. Variáveis de ambiente (EasyPanel → backend → Environment)

Confirme que existem **exatamente** estas três (uma por linha, sem aspas):

```
DATABASE_URL=file:/app/data/si.db
JWT_SECRET=uma-chave-longa-com-pelo-menos-32-caracteres
NEXT_PUBLIC_APP_URL=https://sitecnologia.tec.br
```

- **JWT_SECRET:** se não tiver, gere no Mac: `openssl rand -base64 32` e cole o resultado.
- Clique em **Save**.

---

## 2. Volume (EasyPanel → backend → Storage)

- Deve existir um volume com **Mount path** (ou Container path): `/app/data`.
- Nome do volume: qualquer um (ex.: `site-si-data`).
- Sem esse volume o banco não persiste e o usuário some após restart.

---

## 3. Redeploy

- **Deploy** / **Redeploy** do serviço backend.
- Espere ficar **Running**.

---

## 4. Seed automático (e opcional: rodar manualmente)

- O **Dockerfile** já roda `npx tsx prisma/seed.ts` na subida do container. Com volume em `/app/data`, o banco persiste; o seed só cria o dono se o banco estiver vazio.
- Se quiser conferir ou rodar de novo: abra o **Shell** do backend no EasyPanel e execute `npx tsx prisma/seed.ts`. Deve aparecer "Usuário dono criado" ou "Usuário dono já existe".
- Se der erro de schema/database, confira `DATABASE_URL` e o volume em `/app/data`.

---

## 5. No navegador

- Abra o site (ex.: `https://sitecnologia.tec.br/login`).
- Abra DevTools (F12) → **Application** → **Local Storage** → remova a chave `si_token` se existir.
- Ou use uma **aba anônima**.
- Recarregue a página (Ctrl+Shift+R).
- Login: **dono@solucoesinteligentes.com** / **senha123**.

---

## Se ainda falhar

- Na aba **Network** do DevTools, clique na requisição **login** (POST para `/api/auth/login`).
- Veja o **Response**: se for `{"code":"UNAUTHORIZED","message":"..."}`, o backend está recusando (usuário não existe ou senha errada).
- Confirme no Shell do backend que o usuário existe:

```bash
echo "SELECT id, email FROM User;" | npx prisma db execute --stdin
```

(ou use um cliente SQL no arquivo `/app/data/si.db` se tiver acesso).
