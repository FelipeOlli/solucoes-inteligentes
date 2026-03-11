# Especificação da Arquitetura da Lógica – Site Soluções Inteligentes (SI)

**Documento:** Modelo de dados, status, fluxos e APIs (lógica e contrato; sem UI)  
**Fontes:** PRD, Épicos, Requisitos e Cenários (projetos/solucoes-inteligentes/)  
**Responsável:** @architect (Aria)  
**Data:** 2026-03-01

---

## 1. Modelo de dados

### 1.1 Diagrama de entidades (alto nível)

```
┌─────────────┐      1:N      ┌─────────────┐      1:N      ┌──────────────┐
│   Cliente   │◄──────────────│   Serviço    │◄──────────────│ StatusHist   │
└─────────────┘               └─────────────┘               └──────────────┘
                                      │
                                      │ 1:N
                                      ▼
                               ┌──────────────┐
                               │    Nota      │
                               └──────────────┘
```

- **Cliente:** 1 cliente tem N serviços.
- **Serviço:** 1 serviço tem 1 cliente; N registros de histórico de status; N notas.
- **Status** (do serviço): valor atual no próprio Serviço; histórico em entidade separada (StatusHist).
- **Nota:** pertence a 1 serviço; flag indica se é interna ou visível ao cliente.

---

### 1.2 Entidade: Cliente

| Atributo     | Tipo         | Obrigatório | Descrição |
|--------------|--------------|-------------|-----------|
| id           | UUID ou PK   | Sim         | Identificador único interno. |
| nome         | string       | Sim         | Nome do cliente (pessoa ou empresa). |
| email        | string       | Sim         | E-mail; **único** no sistema (parte da regra de unicidade). |
| telefone     | string       | Sim         | Telefone/WhatsApp (ex.: (21) 96531-8993); **único** no sistema (parte da regra de unicidade). |
| endereco     | string       | Não         | Endereço quando relevante. |
| criado_em    | datetime     | Sim         | Data/hora de criação (auditoria). |
| atualizado_em| datetime     | Sim         | Data/hora da última alteração. |

**Regra de unicidade (MVP):** Tanto **email** quanto **telefone** são únicos. Não pode existir dois clientes com o mesmo e-mail nem dois com o mesmo telefone. Ao criar serviço, se o dono informar e-mail ou telefone já cadastrado, o sistema associa ao cliente existente (e não cria novo). Índices únicos recomendados: email, telefone.

**Relacionamentos:** Cliente 1:N Serviço (um cliente tem vários serviços).

---

### 1.3 Entidade: Serviço

| Atributo        | Tipo         | Obrigatório | Descrição |
|-----------------|--------------|-------------|-----------|
| id              | UUID ou PK   | Sim         | Identificador único interno. |
| id_cliente      | FK → Cliente | Sim         | Cliente dono do serviço. |
| codigo          | string       | Sim         | **Identificador legível único** (ex.: SI-2026-0001). Gerado pelo sistema; usado na comunicação com o cliente e na busca. |
| tipo_servico    | enum/string  | Sim         | Categoria do serviço (lista fixa no MVP – ver 2.1). |
| descricao       | string       | Sim         | Resumo/descrição do serviço. |
| status_atual    | enum         | Sim         | Status atual (valores definidos na seção 2). |
| data_abertura   | date         | Sim         | Data de abertura (pode ser a data de criação). |
| data_conclusao  | date         | Não         | Preenchida quando status = Concluído ou Cancelado (opcional para relatórios). |
| prazo_estimado  | date         | Não         | Prazo estimado de conclusão. |
| valor_estimado | decimal      | Não         | Valor estimado (se aplicável). |
| endereco_servico| string       | Não         | Local/endereço do atendimento. |
| contato_preferencial | string  | Não         | Telefone ou e-mail preferencial para contato neste serviço. |
| criado_em       | datetime     | Sim         | Data/hora de criação. |
| atualizado_em   | datetime     | Sim         | Data/hora da última alteração. |

**Relacionamentos:** Serviço N:1 Cliente; Serviço 1:N StatusHist; Serviço 1:N Nota.

**Índices recomendados:** codigo (único), id_cliente, status_atual, data_abertura (para listagem e filtros).

---

### 1.4 Entidade: StatusHist (Histórico de status)

| Atributo    | Tipo       | Obrigatório | Descrição |
|-------------|------------|-------------|-----------|
| id          | UUID ou PK | Sim         | Identificador único. |
| id_servico  | FK → Serviço| Sim         | Serviço ao qual o registro pertence. |
| status_anterior | enum    | Não         | Status antes da mudança (null na abertura). |
| status_novo | enum       | Sim         | Status após a mudança. |
| id_autor    | FK ou string| Sim        | Quem alterou (no MVP: referência ao “dono” ou usuário interno; tipo definido na implementação). |
| criado_em   | datetime   | Sim         | Data/hora da mudança (imutável, append-only). |

**Regra:** Inserção apenas (append). Sem atualização nem exclusão. Ordenação por criado_em para exibir linha do tempo.

---

### 1.5 Entidade: Nota

| Atributo    | Tipo        | Obrigatório | Descrição |
|-------------|-------------|-------------|-----------|
| id          | UUID ou PK  | Sim         | Identificador único. |
| id_servico  | FK → Serviço| Sim         | Serviço ao qual a nota pertence. |
| conteudo    | string      | Sim         | Texto da observação/mensagem. |
| visivel_cliente | boolean  | Sim         | true = mensagem visível ao cliente na linha do tempo; false = apenas dono. |
| id_autor    | FK ou string| Sim         | Quem criou (dono, no MVP). |
| criado_em   | datetime    | Sim         | Data/hora de criação. |

**Regra:** Notas não são editadas nem apagadas (auditoria). Ordenação por criado_em.

---

## 2. Status do serviço e transições

### 2.1 Lista de status (MVP)

| Código            | Nome (exibição)     | Descrição resumida |
|-------------------|---------------------|---------------------|
| ABERTO            | Aberto               | Serviço recém-criado. |
| EM_ANDAMENTO      | Em andamento        | Em execução. |
| AGUARDANDO_PECA   | Aguardando peça     | Parado por falta de peça. |
| AGUARDANDO_CLIENTE| Aguardando cliente  | Parado por decisão/resposta do cliente. |
| CONCLUIDO         | Concluído           | Finalizado com sucesso. |
| CANCELADO         | Cancelado           | Não será realizado. |

**Persistência:** Pode ser enum no código + tabela de referência, ou apenas tabela `status` com código e label. No MVP, lista fixa; sem CRUD de status pelo dono.

### 2.2 Transições permitidas

Regra: **transições restritas**. A partir de CONCLUIDO e CANCELADO não há volta; demais fluxos permitidos conforme matriz.

- **ABERTO** → EM_ANDAMENTO | AGUARDANDO_PECA | AGUARDANDO_CLIENTE | CANCELADO
- **EM_ANDAMENTO** → ABERTO | AGUARDANDO_PECA | AGUARDANDO_CLIENTE | CONCLUIDO | CANCELADO
- **AGUARDANDO_PECA** → ABERTO | EM_ANDAMENTO | AGUARDANDO_CLIENTE | CANCELADO
- **AGUARDANDO_CLIENTE** → ABERTO | EM_ANDAMENTO | AGUARDANDO_PECA | CANCELADO
- **CONCLUIDO** → (nenhuma – estado final)
- **CANCELADO** → (nenhuma – estado final)

**Implementação:** Backend valida a transição antes de atualizar `Serviço.status_atual` e inserir registro em StatusHist. Retorna erro 400 se transição inválida.

---

## 3. Fluxos

### 3.1 Fluxo: Registro de serviço

1. **Dono** autenticado chama API de criação de serviço (ver 4.2).
2. Payload: `id_cliente` (ou dados para criar cliente novo), `tipo_servico`, `descricao`, `data_abertura` (opcional; default hoje), campos opcionais (prazo, valor, endereço, contato).
3. **Backend:**
   - Se cliente novo: valida unicidade (email e telefone); cria Cliente; usa id retornado.
   - Gera `codigo` único (ex.: SI-2026-0001, sequencial por ano).
   - Cria Serviço com `status_atual = ABERTO`.
   - Insere primeiro registro em StatusHist: status_anterior = null, status_novo = ABERTO, id_autor = dono.
4. Resposta: serviço criado com id, codigo e status ABERTO.
5. (Fase 2: opção de enviar link de acompanhamento ao cliente por e-mail/WhatsApp.)

---

### 3.2 Fluxo: Mudança de status

1. **Dono** autenticado envia nova transição (ex.: ABERTO → EM_ANDAMENTO) para o serviço (id ou codigo).
2. **Backend:**
   - Carrega Serviço; verifica se transição (status_atual → novo_status) é permitida (matriz 2.2).
   - Se inválida: retorna 400 com mensagem clara.
   - Se válida: atualiza Serviço.status_atual (e opcionalmente data_conclusao se CONCLUIDO/CANCELADO); insere registro em StatusHist (status_anterior, status_novo, id_autor, criado_em).
3. Resposta: serviço atualizado e evento de histórico disponível para leitura.
4. (Fase 2: disparar notificação ao cliente conforme configuração.)

---

### 3.3 Fluxo: Acesso do cliente à área restrita

**Objetivo:** Cliente identifica-se e acessa apenas seus serviços (somente leitura).

**Opção A – Link + token (recomendada para MVP)**  
- Ao criar o serviço (ou em ação “Enviar link ao cliente”), o sistema gera um **token de acesso** de uso único ou de longa duração, vinculado ao `id_cliente`.  
- URL exemplo: `https://site-si.com/acompanhar?token=xxx` ou `https://site-si.com/acompanhar/xxx`.  
- Backend: ao acessar a URL, valida o token; se válido, associa a sessão ao `id_cliente` e permite apenas leitura dos serviços daquele cliente.  
- **Vantagem:** Cliente não precisa criar senha; basta guardar o link (ou receber por WhatsApp/e-mail manualmente no MVP).  
- **Segurança:** Token longo, aleatório, vinculado ao cliente; invalidar em caso de comprometimento (trocar token e reenviar link).

**Opção B – Login e-mail + senha**  
- Cliente cadastrado com e-mail; no primeiro acesso, define senha (fluxo “esqueci senha” por e-mail).  
- Login: e-mail + senha; backend valida e associa sessão ao id_cliente.  
- **Vantagem:** Acesso repetido sem novo link. **Custo:** Fluxo de cadastro de senha e recuperação.

**Recomendação MVP:** **Opção A (link + token)**. Fluxo: dono cria serviço → sistema exibe “Link para o cliente” (com token); dono copia e envia por WhatsApp/e-mail. Cliente abre o link e vê lista de serviços + detalhe com linha do tempo. Token pode ser único por cliente (acesso a todos os serviços daquele cliente) ou por serviço (acesso só àquele serviço); recomenda-se **por cliente** para o cliente ver todos os seus serviços.

**Fluxo técnico resumido (Opção A):**
1. Dono gera “link para cliente” (backend cria ou reutiliza token para id_cliente; retorna URL).
2. Cliente acessa URL; backend valida token, retorna dados de sessão (ex.: JWT ou cookie) com claim `role=cliente` e `id_cliente`.
3. Todas as requisições do cliente incluem esse token; backend filtra **sempre** por `id_cliente` (lista e detalhe de serviços; notas com visivel_cliente=true).
4. APIs de escrita (criar/alterar serviço, status, nota) retornam 403 para role=cliente.

---

## 4. Especificação de APIs e autenticação

### 4.1 Autenticação (alto nível)

| Perfil  | Mecanismo sugerido (MVP) | Uso |
|---------|---------------------------|-----|
| **Dono**| Login e-mail + senha (ou único usuário admin configurado no ambiente). Geração de sessão (JWT ou cookie) com claim `role=dono`. | Acesso a todas as APIs de gestão (CRUD cliente, serviço, status, notas; listagem total). |
| **Cliente**| Token de acesso (link) vinculado ao id_cliente. Troca por sessão (JWT ou cookie) com `role=cliente` e `id_cliente`. | Acesso somente às APIs de leitura filtradas por id_cliente. |

**Autorização:** Em toda requisição, o backend identifica o usuário (dono ou cliente) e aplica:
- **role=dono:** pode chamar qualquer endpoint listado abaixo (escopo dono).
- **role=cliente:** pode chamar apenas GET /clientes/me/servicos e GET /clientes/me/servicos/:id (ou equivalente); qualquer outro retorna 403.

---

### 4.2 Contrato de APIs (MVP)

Base: REST; JSON. Prefixo sugerido: `/api` (ex.: `/api/clientes`). Autenticação: Bearer token (JWT) ou cookie de sessão.

#### 4.2.1 Escopo DONO (todas exigem autenticação dono)

| Método | Recurso | Descrição |
|--------|---------|-----------|
| POST   | /api/clientes | Criar cliente (nome, email, telefone, endereco opcional). Retorna cliente com id. Validação: email e telefone únicos. |
| GET    | /api/clientes | Listar clientes (query: q para busca por nome/email/telefone). |
| GET    | /api/clientes/:id | Detalhe do cliente. |
| POST   | /api/servicos | Criar serviço (id_cliente ou payload de cliente novo, tipo_servico, descricao, data_abertura?, prazo?, valor?, endereco?, contato?). Retorna serviço com codigo e status ABERTO. |
| PATCH  | /api/servicos/:id | Atualizar serviço (campos editáveis: ex. prazo, valor, descricao). Não usar para mudar status (usar endpoint de status). |
| PATCH  | /api/servicos/:id/status | Mudança de status. Body: { "status_novo": "EM_ANDAMENTO" }. Valida transição; atualiza Serviço e insere StatusHist. |
| POST   | /api/servicos/:id/notas | Adicionar nota. Body: { "conteudo": "...", "visivel_cliente": true\|false }. |
| GET    | /api/servicos | Listar serviços (query: status, cliente_id, data_inicio, data_fim, q para busca por codigo/nome cliente). Paginação recomendada. |
| GET    | /api/servicos/:id | Detalhe do serviço com histórico de status e notas (dono vê todas as notas). |
| GET    | /api/servicos/:id/link-cliente | Gerar ou retornar link de acompanhamento para o cliente (token vinculado ao id_cliente do serviço). Retorna { "url": "https://..." }. |

#### 4.2.2 Escopo CLIENTE (autenticação por token de cliente)

| Método | Recurso | Descrição |
|--------|---------|-----------|
| GET    | /api/clientes/me/servicos | Listar serviços do cliente autenticado (id_cliente do token). Retorna lista com codigo, tipo_servico, status_atual, data_abertura. |
| GET    | /api/clientes/me/servicos/:id | Detalhe do serviço **se** pertencer ao id_cliente do token; senão 404. Retorna status_atual e linha do tempo (StatusHist + Notas com visivel_cliente=true, ordenados por data). |

**Regra:** Backend **sempre** filtra por id_cliente da sessão nas rotas `/clientes/me/*`. Não existe listagem de todos os serviços nem alteração de dados para o cliente.

---

### 4.3 Códigos HTTP e erros

- **200** OK (GET, PATCH com sucesso).
- **201** Created (POST de cliente ou serviço).
- **400** Bad Request (payload inválido; transição de status não permitida).
- **401** Unauthorized (token ausente ou inválido).
- **403** Forbidden (recurso não permitido para o perfil; ex.: cliente tentando PATCH em serviço).
- **404** Not Found (recurso não existe ou não pertence ao cliente).
- **409** Conflict (ex.: email ou telefone duplicado ao criar cliente).

Corpo de erro sugerido: `{ "code": "...", "message": "..." }`.

---

## 5. Resumo para implementação

- **Modelo:** Cliente (unicidade por email e telefone); Serviço (codigo único, status_atual, FK cliente); StatusHist (append-only); Nota (visivel_cliente).
- **Status:** Lista fixa (ABERTO, EM_ANDAMENTO, AGUARDANDO_PECA, AGUARDANDO_CLIENTE, CONCLUIDO, CANCELADO); transições restritas (2.2).
- **Fluxos:** Registro de serviço (criar cliente se novo → criar serviço → primeiro StatusHist); mudança de status (validar transição → atualizar Serviço + StatusHist); acesso cliente (link+token → sessão com id_cliente → apenas GET filtrado).
- **APIs:** Dono = CRUD clientes/servicos, PATCH status, POST notas, GET listagem/detalhe, GET link-cliente. Cliente = GET me/servicos e me/servicos/:id.
- **Auth:** Dono = login (e-mail/senha); Cliente = token no link (claim id_cliente); autorização por role em cada endpoint.

---

*Documento gerado por @architect (Aria). Foco em lógica e contrato – sem desenho de telas ou UI.*
