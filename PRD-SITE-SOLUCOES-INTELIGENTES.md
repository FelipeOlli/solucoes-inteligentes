# Product Requirements Document (PRD) – Site Soluções Inteligentes

**Produto:** Site unificado SI (visão dono + visão cliente)  
**Versão:** 1.0  
**Responsável:** @pm (Bob)  
**Data:** 2026-03-01  
**Documentos de entrada:** Brief (BRIEF-PROJETO-SITE-SI.md), Requisitos e Cenários (REQUISITOS-E-CENARIOS-SI.md)

---

## 1. Objetivos e contexto

### 1.1 Objetivos

- Permitir ao **dono** da SI registrar e gerir serviços (cadastro, status, histórico) em um único lugar.
- Permitir ao **cliente** acompanhar o andamento do seu serviço (status atual e linha do tempo) sem depender apenas de WhatsApp/telefone.
- Manter **dois acessos distintos**: painel interno (dono) e área do cliente (somente leitura, só seus serviços).
- Garantir **rastreabilidade**: histórico de status e notas por serviço, para dono e cliente (conforme regras de visibilidade).
- Preparar base para evolução (notificações, múltiplos usuários internos, mensagens) sem bloquear o MVP.

### 1.2 Contexto

A Soluções Inteligentes é uma empresa de TI (manutenção, redes, CFTV, elétrica, etc.) que hoje gerencia serviços de forma informal. O dono precisa de um sistema para registrar cada atendimento, alterar status e consultar histórico; o cliente precisa poder ver em que etapa está o serviço. O escopo é **lógica e produto primeiro** (sem definição de telas neste PRD); a identidade visual segue o Manual de Marca já definido.

### 1.3 Change log

| Data       | Versão | Descrição                    | Autor |
|------------|--------|------------------------------|--------|
| 2026-03-01 | 1.0    | PRD inicial, MVP e fases futuras | @pm    |

---

## 2. Escopo e priorização

### 2.1 Escopo do MVP (Fase 1)

- **Visão dono:** Cadastro de cliente (reutilizável); criação de serviço (cliente, tipo, descrição, data abertura); identificador único por serviço; alteração de status; histórico de status; notas/observações (com regra interna vs visível ao cliente); listagem e filtros (status, período, cliente); busca por serviço ou cliente.
- **Visão cliente:** Acesso seguro à área “meus serviços”; listagem apenas dos serviços do cliente; detalhe do serviço com status atual e linha do tempo (histórico de status); somente leitura.
- **Não no MVP:** Notificações automáticas (e-mail/WhatsApp), múltiplos perfis internos (técnico vs dono), chat/mensagens cliente↔dono, catálogo de tipos de serviço configurável pelo dono.

### 2.2 Fases futuras (explícito fora do MVP)

- **Fase 2 (pós-MVP):** Notificações ao cliente (mudança de status) por e-mail e/ou WhatsApp; opt-in e LGPD.
- **Fase 3:** Mensagens ou canal de comunicação cliente ↔ dono dentro do sistema.
- **Fase 4:** Múltiplos usuários internos (ex.: técnico com permissão limitada); tipos de serviço configuráveis.
- **Fase 5:** Relatórios e indicadores (ex.: serviços por período, por tipo, por status).

---

## 3. Requisitos funcionais (PRD)

Referência: REQUISITOS-E-CENARIOS-SI.md (RF-Dxx, RF-Cxx). Resumo consolidado:

### 3.1 Domínio: Serviço e cliente

| ID   | Requisito | Prioridade |
|------|-----------|------------|
| FR-01 | O sistema deve permitir criar um serviço vinculado a um cliente (existente ou novo). | Must |
| FR-02 | O sistema deve gerar identificador único por serviço. | Must |
| FR-03 | O sistema deve registrar tipo/categoria do serviço, descrição e data de abertura; opcionalmente prazo, valor, endereço, contato. | Must |
| FR-04 | O sistema deve permitir alterar o status do serviço (apenas perfil dono). | Must |
| FR-05 | O sistema deve manter histórico imutável de mudanças de status (quem, quando, anterior, novo). | Must |
| FR-06 | O sistema deve permitir adicionar notas ao serviço, com distinção entre nota interna (só dono) e mensagem visível ao cliente. | Must |
| FR-07 | O sistema deve permitir cadastro e reutilização de cliente (identificação única); um cliente pode ter vários serviços. | Must |

### 3.2 Domínio: Visão dono

| ID   | Requisito | Prioridade |
|------|-----------|------------|
| FR-08 | O dono pode listar serviços com filtros por status, período e cliente. | Must |
| FR-09 | O dono pode buscar serviço por identificador ou por dados do cliente. | Must |
| FR-10 | O dono pode visualizar o histórico completo de um serviço (status e notas). | Must |

### 3.3 Domínio: Visão cliente

| ID   | Requisito | Prioridade |
|------|-----------|------------|
| FR-11 | O cliente acessa área restrita e vê apenas serviços a ele vinculados. | Must |
| FR-12 | O cliente pode listar seus serviços (identificador, tipo, status atual, data abertura). | Must |
| FR-13 | O cliente pode abrir um serviço e ver status atual e linha do tempo (histórico de status e mensagens visíveis). | Must |
| FR-14 | O cliente não pode alterar dados nem status; apenas consulta. | Must |
| FR-15 | O meio de acesso do cliente (link+token, login, etc.) deve ser definido na arquitetura; requisito é identificação segura e vínculo correto cliente ↔ serviços. | Must |

### 3.4 Fora do MVP (registrado para fases futuras)

| ID   | Requisito | Fase |
|------|-----------|------|
| FR-16 | Notificar o cliente quando o status do serviço mudar (e-mail/WhatsApp, configurável, opt-in/LGPD). | 2 |
| FR-17 | Canal de mensagens ou solicitações cliente ↔ dono. | 3 |
| FR-18 | Múltiplos usuários internos com permissões distintas. | 4 |
| FR-19 | Catálogo de tipos de serviço configurável pelo dono. | 4 |

---

## 4. Requisitos não funcionais (alto nível)

| ID    | Requisito | Prioridade |
|-------|-----------|------------|
| NFR-01 | O sistema deve garantir que um cliente visualize somente seus próprios serviços (isolamento de dados). | Must |
| NFR-02 | Autenticação/identificação do dono e do cliente devem ser definidas na arquitetura (segurança e autorização). | Must |
| NFR-03 | Dados e histórico de status devem ser persistidos de forma confiável (auditoria). | Must |
| NFR-04 | O produto deve ser utilizável em ambiente web (detalhes de stack e hospedagem com @architect). | Must |
| NFR-05 | Preparar para LGPD (opt-in para notificações, mínimo de dados); detalhes nas fases de notificação. | Should (MVP), Must (Fase 2) |

---

## 5. Critérios de aceitação em alto nível (MVP)

- **ACE-01** Dono consegue cadastrar cliente e criar serviço com tipo, descrição e data; sistema gera ID único.
- **ACE-02** Dono consegue alterar status do serviço e adicionar notas (internas ou visíveis ao cliente); histórico fica registrado.
- **ACE-03** Dono consegue listar e filtrar serviços por status, período e cliente, e abrir um serviço para ver histórico completo.
- **ACE-04** Cliente consegue acessar a área restrita (mecanismo definido na arquitetura) e ver apenas seus serviços.
- **ACE-05** Cliente consegue abrir um serviço e ver status atual e linha do tempo (histórico de status e mensagens visíveis); não consegue editar.
- **ACE-06** Regras de negócio documentadas (um serviço = um cliente; só dono altera status; transições de status conforme especificação do @architect) estão respeitadas.

---

## 6. Exclusões explícitas (este PRD)

- Definição de telas, wireframes e layout (responsabilidade @ux-design-expert após lógica aprovada).
- Modelo de dados, lista de status, transições de status, APIs e autenticação (responsabilidade @architect).
- Notificações automáticas, chat e múltiplos perfis internos no MVP (fases futuras).

---

## 7. Próximos passos

1. **@architect:** Especificar modelo de dados, estados/transições de status, fluxos (registro, mudança de status, acesso cliente) e contrato de APIs/autenticação.
2. Após arquitetura aprovada: **@ux-design-expert** para telas e experiência; **@sm** / **@dev** para stories e implementação.

---

*PRD gerado por @pm (Bob). Escopo e priorização em alto nível – sem wireframes ou UI.*
