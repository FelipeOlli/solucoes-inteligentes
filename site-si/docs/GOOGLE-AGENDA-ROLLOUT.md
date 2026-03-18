# Agenda Interna + Google Agenda (Rollout)

Guia rápido para ativar e validar a sincronização bidirecional da agenda da plataforma com o Google Agenda.

## 1) Variáveis de ambiente

Defina no ambiente de produção:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (ex.: `https://seu-dominio.com/api/integrations/google-calendar/callback`)
- `NEXT_PUBLIC_APP_URL` (ex.: `https://seu-dominio.com`)

## 2) Configuração no Google Cloud

1. Crie um projeto no Google Cloud.
2. Ative a API **Google Calendar API**.
3. Configure a tela de consentimento OAuth.
4. Crie credenciais OAuth 2.0 (tipo Web Application).
5. Em **Authorized redirect URIs**, adicione exatamente:
   - `https://seu-dominio.com/api/integrations/google-calendar/callback`

## 3) Deploy com migration

Ao subir esta versão, rode as migrações (ou garanta que `prisma migrate deploy` execute no start), incluindo:

- `20260318020000_google_agenda_sync`

## 4) Conectar conta Google da empresa

1. Acesse o dashboard interno.
2. Entre em **Agenda** (`/dashboard/agenda`).
3. Clique em **Conectar Google**.
4. Faça login na conta Google da empresa e conceda permissão.

Após conectar:

- O app salva tokens OAuth.
- O app tenta registrar webhook de mudanças no Google Calendar.

## 5) Validação ponta a ponta

### Fluxo plataforma -> Google

1. Crie um serviço com `dataAgendamento`.
2. Verifique se o evento aparece no Google Calendar.
3. Reagende no calendário interno (drag/drop) e confirme atualização no Google.

### Fluxo Google -> plataforma

1. No Google Calendar, edite data/hora de um evento criado pela plataforma.
2. Aguarde webhook/sincronização.
3. Confirme que `dataAgendamento` mudou no serviço na plataforma.

### Cancelamento

1. Na plataforma, marque serviço como `CANCELADO`.
2. Verifique remoção/cancelamento do evento no Google.

## 6) Operação e recuperação

Na tela da agenda:

- **Sincronizar agora**: força reconciliação inbound/outbound.
- **Reiniciar webhook**: recria assinatura do watch com Google.
- **Desconectar**: remove integração salva no sistema.

## 7) Observações importantes

- A integração atual usa conta Google única da empresa.
- A sincronização bidirecional é orientada a eventos vinculados por `googleEventId` e `servicoId` em `extendedProperties.private`.
- Mudanças em eventos não vinculados a um serviço não criam serviços automaticamente.

