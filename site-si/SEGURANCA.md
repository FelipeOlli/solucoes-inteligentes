# Segurança – Site Soluções Inteligentes

Checklist e boas práticas de segurança do projeto.

---

## 1. JWT e autenticação

- **JWT_SECRET:** Obrigatório em produção. Deve ter **pelo menos 32 caracteres** e ser aleatório. Se estiver ausente ou for o valor padrão, o app **não inicia** em produção (ver `lib/auth.ts`).
- **Geração:** `openssl rand -base64 32` ou similar. Nunca commitar o valor no repositório.
- **Token do dono:** expira em 7 dias; **token do cliente** (link de acompanhamento): 90 dias. Ajuste em `lib/auth.ts` se precisar.

---

## 2. Headers de segurança (next.config.js)

O projeto já envia:

- **X-Frame-Options: DENY** – evita que o site seja embutido em iframe (reduz risco de clickjacking).
- **X-Content-Type-Options: nosniff** – evita MIME sniffing.
- **Referrer-Policy: strict-origin-when-cross-origin** – controla o que é enviado no Referer.
- **Permissions-Policy** – restringe câmera, microfone e geolocalização.

Em produção atrás de proxy (ex.: EasyPanel/Nginx), o proxy pode adicionar ou sobrescrever headers; confira se esses continuam sendo aplicados.

---

## 3. Rate limit no login

- **POST /api/auth/login** tem rate limit em memória: até **8 tentativas por minuto por IP** (configurável em `lib/rate-limit.ts`).
- Em ambiente com várias instâncias do app, considere rate limit centralizado (ex.: Redis) para contar por IP em todas as instâncias.

---

## 4. APIs protegidas

- Rotas de **dono** (serviços, clientes, categorias, usuários, etc.) exigem `getAuthFromRequest` + `isDono`. Sem token válido de dono → 401/403.
- Rotas de **cliente** (ex.: `/api/clientes/me/servicos`) exigem token de cliente (link de acompanhamento).
- **Login** e **session-client** são públicos; o restante das APIs de dono/cliente está protegido por JWT.

---

## 5. Token no link do cliente

- **GET /api/auth/session-client?token=...** troca o token de link (único) por um JWT de cliente. O token aparece na URL; evite vazar (ex.: logs, histórico, compartilhar link). Em cenários de maior sensibilidade, considere fluxo com token no body (POST) e uso de link único de uso único.

---

## 6. Senhas

- Hash com **bcrypt** (via `bcryptjs`). Não armazene senha em texto puro.
- Em produção, exija **senha forte** no cadastro de usuários (comprimento mínimo, caracteres especiais, etc.) e, se possível, política de troca periódica.

---

## 7. Ambiente e deploy

- **Variáveis sensíveis** (JWT_SECRET, DATABASE_URL) apenas em variáveis de ambiente do servidor, nunca no código ou no repositório.
- **HTTPS** em produção (EasyPanel/proxy deve terminar TLS).
- Manter dependências atualizadas (`npm audit`, atualizações de segurança do Next.js e do Node).

---

## 8. Resumo rápido

| Item                    | Onde / Ação                                      |
|-------------------------|---------------------------------------------------|
| JWT_SECRET              | Env em produção, ≥ 32 caracteres                 |
| Headers de segurança    | next.config.js (já configurado)                   |
| Rate limit login        | lib/rate-limit.ts + POST /api/auth/login          |
| APIs dono/cliente       | getAuthFromRequest + isDono/isCliente              |
| Senhas                  | bcrypt; considerar política de senha forte        |
| Token em URL (cliente)  | Evitar vazamento; considerar POST no futuro       |
