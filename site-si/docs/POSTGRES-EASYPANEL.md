# Configurar PostgreSQL no EasyPanel (Site SI)

Passo a passo para usar o Postgres **sidb** que você criou no EasyPanel.

---

## 1. Dados do seu Postgres (pela sua tela)

| Campo | Valor |
|-------|--------|
| Service Name | **sidb** |
| Database Name | **sintel** |
| User | **root** |
| Password | **Sup0rt3.@r00t** |
| Imagem | postgres:17 |

---

## 2. DATABASE_URL no backend (Site SI)

O app **backend** precisa da variável **DATABASE_URL** apontando para o Postgres. No EasyPanel o host é o **nome do serviço**: `sidb`, porta `5432`.

**Importante:** na URL, caracteres especiais da senha devem ser codificados:
- `@` → `%40`
- Sua senha `Sup0rt3.@r00t` na URL fica: `Sup0rt3.%40r00t`

**Valor exato para colar no Environment do backend:**

```
postgresql://root:Sup0rt3.%40r00t@sidb:5432/sintel
```

(uma linha só, sem aspas no painel)

---

## 3. O que fazer no EasyPanel

### 3.1 Garantir que o Postgres está rodando

- Serviço **sidb** (Create Postgres) deve estar **Running**.
- Se o backend e o Postgres estiverem no **mesmo projeto** (ex.: sintel), a rede interna usa o nome `sidb` como host.

### 3.2 Configurar o backend do Site SI

1. Abra o serviço **backend** (Site SI).
2. Vá em **Environment** (variáveis de ambiente).
3. **Altere** a variável **DATABASE_URL** para:
   ```
   postgresql://root:Sup0rt3.%40r00t@sidb:5432/sintel
   ```
4. **Remova** (se existir) o volume **/app/data** do backend — o banco não fica mais no app, e sim no serviço **sidb**.
5. Salve e faça **Redeploy** do backend.

### 3.3 Variáveis que devem continuar

- **JWT_SECRET** – mantém (mín. 32 caracteres).
- **NEXT_PUBLIC_APP_URL** – mantém (ex.: `https://sitecnologia.tec.br`).

---

## 4. Ordem dos serviços na subida

Na primeira vez (ou após criar o Postgres), suba na ordem:

1. **sidb** (Postgres) – aguarde ficar "Running".
2. **backend** (Site SI) – no startup ele roda `prisma migrate deploy` (cria tabelas) e o seed (cria dono e categorias).

---

## 5. Login após o deploy

- URL: `https://sitecnologia.tec.br/login`
- E-mail: **dono@solucoesinteligentes.com**
- Senha: **senha123**

O seed roda automaticamente na subida do backend e cria o usuário dono se ainda não existir.

---

## 6. Login ainda dá "E-mail ou senha inválidos"

Confira na ordem:

1. **Logs do backend** – No EasyPanel, abra o serviço backend → **Logs**. Deve aparecer algo como:
   - `Usuário dono criado: dono@solucoesinteligentes.com` ou `Usuário dono já existe`
   - Se aparecer erro de conexão ao Postgres, a **DATABASE_URL** ou a rede (host `sidb`) está errada.

2. **Rodar o seed manualmente** – Abra o **Shell** do backend e execute:
   ```bash
   npx tsx prisma/seed.ts
   ```
   Deve aparecer "Usuário dono criado" ou "Usuário dono já existe". Depois tente o login de novo.

3. **Senha correta** – O seed cria o usuário com senha **senha123** (tudo minúsculo, sem espaço).

4. **Limpar token antigo** – No navegador: F12 → Application → Local Storage → apague a chave **si_token** (ou use aba anônima) e recarregue a página de login.

---

## 7. Se der erro de conexão

- Confirme que **sidb** está na mesma rede/projeto que o **backend** (no EasyPanel isso costuma ser automático).
- Confirme que a senha na URL está com `@` codificado: `%40`.
- Nos logs do **backend**, procure por mensagens do Prisma (ex.: "can't reach database").
