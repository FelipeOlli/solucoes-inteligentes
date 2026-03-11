# Épicos – Site Soluções Inteligentes (SI)

**Documento:** Épicos priorizados (MVP e fases futuras)  
**Fonte:** PRD-SITE-SOLUCOES-INTELIGENTES.md, REQUISITOS-E-CENARIOS-SI.md  
**Responsável:** @pm (Bob)  
**Data:** 2026-03-01

---

## Visão geral

Os épicos estão organizados por **fase**: MVP (Fase 1) primeiro; fases seguintes explícitas para não misturar escopo. Cada épico agrupa capacidades que podem ser quebradas em histórias pelo @sm.

---

## Fase 1 – MVP

### EPIC-01: Cadastro e gestão de clientes

**Objetivo:** Permitir ao dono registrar clientes e reutilizá-los em novos serviços.

**Capacidades:**
- Cadastrar cliente (nome, telefone, e-mail; endereço opcional).
- Identificação única do cliente (critério definido na arquitetura).
- Buscar/reutilizar cliente existente ao criar serviço.

**Critérios de aceitação (alto nível):**
- Dono consegue criar cliente e associá-lo a mais de um serviço.
- Sistema não permite duplicação de cliente conforme critério de unicidade definido.

**Prioridade:** Must (MVP)

---

### EPIC-02: Registro e gestão de serviços (visão dono)

**Objetivo:** Dono pode criar serviços, alterar status, adicionar notas e consultar lista/histórico.

**Capacidades:**
- Criar serviço: cliente, tipo/categoria, descrição, data abertura; opcionais (prazo, valor, endereço, contato).
- Gerar identificador único do serviço.
- Alterar status do serviço (lista de status e transições definidas pelo @architect).
- Registrar histórico de mudanças de status (quem, quando, anterior, novo).
- Adicionar notas ao serviço (interna ou visível ao cliente).
- Listar serviços com filtros (status, período, cliente).
- Buscar serviço por identificador ou dados do cliente.
- Visualizar detalhe do serviço com histórico completo.

**Critérios de aceitação (alto nível):**
- Dono realiza fluxo completo: criar serviço → alterar status → adicionar nota → consultar lista e detalhe com histórico.
- Histórico é imutável (apenas append).

**Prioridade:** Must (MVP)

---

### EPIC-03: Acesso e autenticação (dono e cliente)

**Objetivo:** Dois acessos distintos e seguros: dono (painel interno) e cliente (área restrita).

**Capacidades:**
- Autenticação/identificação do dono (mecanismo definido pelo @architect).
- Autenticação/identificação do cliente para área “meus serviços” (ex.: link+token, login e-mail/senha – decisão com @architect).
- Garantir que cliente acesse apenas serviços a ele vinculados; dono acesse todos.

**Critérios de aceitação (alto nível):**
- Dono acessa painel e enxerga todos os serviços.
- Cliente acessa área restrita e enxerga apenas seus serviços; sem acesso a funções de gestão.

**Prioridade:** Must (MVP)

---

### EPIC-04: Acompanhamento do serviço (visão cliente)

**Objetivo:** Cliente visualiza seus serviços, status atual e linha do tempo; somente leitura.

**Capacidades:**
- Listar serviços do cliente (identificador, tipo, status atual, data abertura).
- Abrir detalhe do serviço: status atual e linha do tempo (histórico de status e mensagens visíveis ao cliente).
- Garantir que cliente não possa alterar status nem dados.

**Critérios de aceitação (alto nível):**
- Cliente vê lista dos seus serviços e, ao abrir um, vê status e histórico; nenhuma ação de edição disponível.

**Prioridade:** Must (MVP)

---

## Fase 2 – Pós-MVP

### EPIC-05: Notificações ao cliente

**Objetivo:** Notificar o cliente quando o status do serviço mudar (e-mail e/ou WhatsApp).

**Capacidades:**
- Disparo de notificação em mudança de status (canais e templates definidos na implementação).
- Configuração (ativar/desativar por canal ou global).
- Respeito a opt-in e LGPD.

**Critérios de aceitação (alto nível):**
- Cliente pode ser notificado por e-mail e/ou WhatsApp conforme configuração; opt-in respeitado.

**Prioridade:** Should (Fase 2)

---

## Fase 3 – Futuro

### EPIC-06: Canal de comunicação cliente ↔ dono

**Objetivo:** Mensagens ou solicitações dentro do sistema entre cliente e dono.

**Capacidades:**
- Cliente enviar mensagem ou solicitação vinculada ao serviço.
- Dono responder; histórico de mensagens visível no contexto do serviço.

**Prioridade:** Could (Fase 3)

---

## Fase 4 – Futuro

### EPIC-07: Múltiplos usuários internos

**Objetivo:** Perfis distintos (ex.: dono vs técnico) com permissões diferentes.

**Capacidades:**
- Cadastro de usuários internos (ex.: técnico).
- Permissões: técnico pode alterar status e notas; dono mantém controle total e configurações.
- Tipos de serviço configuráveis pelo dono (catálogo).

**Prioridade:** Could (Fase 4)

---

### EPIC-08: Relatórios e indicadores

**Objetivo:** Relatórios básicos para gestão (serviços por período, tipo, status).

**Capacidades:**
- Relatórios ou dashboards simples (escopo a detalhar).

**Prioridade:** Could (Fase 4+)

---

## Resumo de priorização

| Épico | Título | Fase | Prioridade |
|-------|--------|------|------------|
| EPIC-01 | Cadastro e gestão de clientes | 1 – MVP | Must |
| EPIC-02 | Registro e gestão de serviços (visão dono) | 1 – MVP | Must |
| EPIC-03 | Acesso e autenticação (dono e cliente) | 1 – MVP | Must |
| EPIC-04 | Acompanhamento do serviço (visão cliente) | 1 – MVP | Must |
| EPIC-05 | Notificações ao cliente | 2 | Should |
| EPIC-06 | Canal de comunicação cliente ↔ dono | 3 | Could |
| EPIC-07 | Múltiplos usuários internos | 4 | Could |
| EPIC-08 | Relatórios e indicadores | 4+ | Could |

---

## Próximo passo

**@architect:** Usar PRD + este documento de épicos para especificar modelo de dados, regras de status, fluxos e APIs. A partir daí, @sm pode quebrar os épicos MVP em histórias para @dev.

---

*Épicos gerados por @pm (Bob). MVP primeiro; fases futuras explícitas.*
