# Requisitos e Cenários – Site Soluções Inteligentes (SI)

**Documento:** Requisitos e regras de negócio em alto nível (lógica primeiro, sem telas)  
**Fonte:** Brief em `BRIEF-PROJETO-SITE-SI.md`  
**Responsável:** @analyst (Atlas)  
**Data:** 2026-03-01

---

## 1. Objetivo do documento

Estruturar **o quê** o sistema deve fazer (visão dono e visão cliente), em linguagem de domínio, com cenários e regras de negócio em alto nível. Serve de entrada para @pm (PRD/épicos) e @architect (modelo de dados, fluxos, APIs). **Não inclui** desenho de telas nem especificação de interface.

---

## 2. Personas

| Persona | Quem é | Objetivo principal no sistema |
|--------|--------|--------------------------------|
| **Dono** | Responsável pela empresa SI; cadastra e gerencia os serviços. | Registrar serviços, atualizar status, consultar histórico e ter visão de controle (lista, filtros, busca). |
| **Cliente** | Pessoa ou empresa que contrata a SI (manutenção, rede, CFTV, etc.). | Saber em que etapa está seu serviço, ver histórico de etapas e (se o sistema permitir) um canal de comunicação/notificação. |

**Observação:** O dono pode atuar também como “atendente” ou “técnico” no dia a dia; para o sistema, considera-se um único perfil “dono” com permissão total. Separação entre dono e técnico pode ser refinada depois (escopo futuro).

---

## 3. Visão dono – Requisitos funcionais (alto nível)

### 3.1 Registro de serviço

- **RF-D01** O dono pode **criar um novo serviço** vinculado a um cliente.
- **RF-D02** No registro, o dono informa (em alto nível): **cliente** (identificação), **tipo/categoria do serviço** (ex.: manutenção PC, rede, CFTV, elétrica, porteiro eletrônico, formatação, suporte remoto/presencial), **descrição ou resumo**, **data de abertura** (ou uso da data atual).
- **RF-D03** O sistema deve **gerar um identificador único** do serviço (ex.: número ou código) para referência em comunicação e acompanhamento.
- **RF-D04** O dono pode **opcionalmente** informar: prazo estimado, valor estimado, endereço/local do serviço, contato preferencial do cliente (telefone/WhatsApp, e-mail). (Refinamento de campos fica com @architect.)

### 3.2 Gestão de status e etapas

- **RF-D05** O dono pode **alterar o status** do serviço ao longo do tempo (ex.: aberto, em andamento, aguardando peça/cliente, concluído, cancelado).
- **RF-D06** O sistema deve **registrar histórico de mudanças de status** (quem alterou, quando, status anterior e novo), para auditoria e para exibir linha do tempo ao cliente.
- **RF-D07** O dono pode **adicionar observações/notas** ao serviço (ex.: “Cliente autorizou orçamento”, “Equipamento retirado para análise”). Essas notas podem ser apenas internas ou (por regra de negócio) visíveis ao cliente – a regra deve ser explícita.

### 3.3 Consulta e listagem

- **RF-D08** O dono pode **listar todos os serviços**, com critérios mínimos: por status, por período (data abertura/conclusão), por cliente.
- **RF-D09** O dono pode **buscar/abrir um serviço específico** pelo identificador ou por dados do cliente (nome, telefone).
- **RF-D10** O dono pode **visualizar o histórico completo** de um serviço (status, datas, notas) para gestão e atendimento.

### 3.4 Cliente (cadastro/identificação)

- **RF-D11** O dono pode **registrar dados do cliente** ao criar o serviço ou em momento anterior (nome, telefone, e-mail, endereço quando relevante). O sistema deve permitir reutilizar um cliente já cadastrado em novos serviços.
- **RF-D12** O sistema deve **identificar o cliente de forma única** (ex.: por e-mail, telefone ou ID interno) para vincular vários serviços ao mesmo cliente e para o cliente acessar “seus” serviços.

---

## 4. Visão cliente – Requisitos funcionais (alto nível)

### 4.1 Acesso e identificação

- **RF-C01** O cliente deve poder **acessar uma área restrita** onde vê apenas os serviços a ele vinculados (sem ver serviços de outros clientes).
- **RF-C02** O **meio de acesso** do cliente deve ser definido na arquitetura (ex.: link + código/CPF/e-mail + token, ou login com e-mail/senha). O requisito é: **identificação segura e vinculação correta cliente ↔ serviços**.

### 4.2 Acompanhamento do serviço

- **RF-C03** O cliente pode **visualizar a lista dos seus serviços** (ex.: em aberto e recentes), com identificador, tipo, status atual e data de abertura (e, se aplicável, previsão de conclusão).
- **RF-C04** O cliente pode **abrir um serviço e ver o status atual** e uma **linha do tempo (histórico)** de mudanças de status/etapas, com datas (e opcionalmente mensagens curtas visíveis ao cliente).
- **RF-C05** O cliente **não** altera status nem dados do serviço; apenas **consulta**. (Envio de mensagem ou solicitação pode ser escopo futuro.)

### 4.3 Comunicação e notificações (alto nível)

- **RF-C06** O sistema pode **notificar o cliente** quando o status do serviço mudar (ex.: e-mail ou WhatsApp), conforme regras definidas na arquitetura. Detalhes (canais, templates, opt-in) ficam para @architect / implementação.

---

## 5. Cenários (fluxos em texto)

### 5.1 Cenário 1: Dono abre um novo serviço para um cliente

1. Dono decide registrar um novo atendimento (ex.: manutenção de notebook).
2. Dono informa o cliente (existente ou novo: nome, telefone, e-mail).
3. Dono informa tipo do serviço, descrição resumida e, se quiser, data, local, valor estimado.
4. Sistema gera identificador único do serviço e grava status inicial (ex.: “Aberto”).
5. Sistema registra data/hora de abertura e, se configurado, pode enviar ao cliente um link ou notificação de que o serviço foi aberto.

**Resultado:** Serviço criado, cliente vinculado, dono e (depois) cliente podem acompanhar.

### 5.2 Cenário 2: Dono atualiza o status do serviço

1. Dono localiza o serviço (lista ou busca).
2. Dono altera o status (ex.: de “Aberto” para “Em andamento” ou “Aguardando peça”).
3. Sistema grava a mudança com data/hora e identidade (dono).
4. Histórico do serviço é atualizado; cliente pode ver a nova etapa (visão cliente).
5. Opcional: sistema dispara notificação ao cliente informando a mudança.

**Resultado:** Status e histórico consistentes; cliente informado conforme regra.

### 5.3 Cenário 3: Dono adiciona nota ao serviço

1. Dono abre o serviço.
2. Dono registra uma observação (ex.: “Orçamento aprovado por WhatsApp em 01/03”).
3. Sistema associa a nota ao serviço com data/hora (e define se é só interna ou visível ao cliente – regra de negócio).

**Resultado:** Contexto preservado para o dono e, se aplicável, para o cliente.

### 5.4 Cenário 4: Cliente acessa e acompanha seu serviço

1. Cliente recebe link/código ou acessa o site e se identifica (conforme mecanismo definido na arquitetura).
2. Sistema exibe apenas serviços daquele cliente.
3. Cliente escolhe um serviço e vê: status atual e linha do tempo (mudanças de status, datas e, se houver, mensagens visíveis ao cliente).
4. Cliente não altera dados; apenas consulta.

**Resultado:** Cliente informado sem acesso a dados de outros ou a funções de gestão.

### 5.5 Cenário 5: Dono consulta histórico e lista serviços

1. Dono acessa a visão dono (painel interno).
2. Dono filtra por status, período ou cliente e vê a lista de serviços.
3. Dono abre um serviço e vê todo o histórico (status, notas, datas) para atendimento e gestão.

**Resultado:** Dono tem controle e rastreabilidade completa.

---

## 6. Regras de negócio (alto nível)

### 6.1 Serviço

- **RN-01** Todo serviço pertence a **um e apenas um** cliente.
- **RN-02** Todo serviço tem **um status atual** e um **histórico de status** imutável (apenas append).
- **RN-03** Todo serviço tem **identificador único** no sistema e **data de abertura**.
- **RN-04** Tipos/categorias de serviço devem ser **predefinidos** (lista fixa ou configurável pelo dono – escopo pode ser MVP fixo e depois configurável).

### 6.2 Status

- **RN-05** Apenas o **dono** (ou perfil com permissão equivalente) pode **alterar o status** do serviço.
- **RN-06** Transições de status podem ser **livres** (qualquer status → qualquer outro) ou **restritas** (ex.: “Concluído” não volta para “Aberto”) – a definição exata fica com @architect; o requisito é que a regra exista e seja documentada.

### 6.3 Cliente

- **RN-07** O **cliente** é identificado de forma única (critério a definir: e-mail, telefone ou ID interno).
- **RN-08** Um cliente pode ter **vários serviços** ao longo do tempo; na visão cliente ele vê apenas os seus.

### 6.4 Visibilidade e segurança

- **RN-09** O **cliente** vê apenas **seus próprios serviços**; nunca lista ou acessa serviços de outros.
- **RN-10** O **dono** vê e gerencia **todos** os serviços.
- **RN-11** Notas/observações podem ser **apenas internas** (só dono) ou **visíveis ao cliente**; a regra deve ser explícita e consistente (ex.: “nota interna” vs “mensagem ao cliente”).

### 6.5 Notificações

- **RN-12** Notificações ao cliente (ex.: mudança de status) devem ser **configuráveis** (ativar/desativar por canal ou globalmente) e respeitar **opt-in** se aplicável (LGPD). Detalhes com @architect.

---

## 7. Escopo explícito fora deste documento (para @pm / @architect)

- **Modelo de dados:** entidades (Serviço, Cliente, Status, Histórico, Nota), atributos obrigatórios e relacionamentos → @architect.
- **Fluxos técnicos:** autenticação dono vs cliente, geração de link/código de acesso, APIs de leitura/escrita → @architect.
- **Lista de status** e transições permitidas → @architect (pode propor e validar com o dono).
- **Priorização e épicos** (MVP vs fases seguintes) → @pm.
- **Telas e UX:** nenhuma definição aqui; apenas após lógica aprovada, com @ux-design-expert.

---

## 8. Próximos passos sugeridos

1. **@pm:** Usar este documento para elaborar o **PRD** e **épicos**, priorizando MVP (registro de serviço + gestão de status + acompanhamento cliente) e deixando explícito o que fica para fases futuras (ex.: notificações automáticas, múltiplos técnicos, mensagens cliente↔dono).
2. **@architect:** Usar requisitos e regras acima para definir **modelo de dados**, **estados do serviço**, **fluxos** (registro, mudança de status, acesso cliente) e **contrato de APIs/autenticação**.

---

*Documento gerado por @analyst (Atlas). Requisitos e cenários em alto nível – sem desenho de telas.*
