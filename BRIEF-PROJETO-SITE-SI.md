# Brief do Projeto: Site Soluções Inteligentes

**Cliente:** Soluções Inteligentes (SI) – Empresa de TI  
**Data:** 2026-03-01  
**Orquestrador:** @aios-master

---

## 1. Objetivo do produto

Criar um **site** que una:

| Visão | Público | Função principal |
|-------|--------|-------------------|
| **Visão dono** | Você (dono da empresa) | Registro e gestão de serviços (cadastro, status, histórico) |
| **Visão cliente** | Clientes finais | Acompanhamento do serviço (status, etapas, comunicação) |

Ou seja: um sistema com **dois acessos** – painel interno para você e área do cliente para acompanhamento, sempre alinhado à marca Soluções Inteligentes.

---

## 2. Marca – Soluções Inteligentes (Manual de Marca)

### Posicionamento
- **Frase:** "Inovação que flui"
- **Proposta:** Tecnologia que simplifica a vida; inovação que se adapta às necessidades do negócio e da equipe.

### Padrão cromático (obrigatório no site)

| Cor | Uso | HEX | RGB | Observação |
|-----|-----|-----|-----|------------|
| **Azul institucional** | Cor principal da marca | `#122969` | 18, 41, 105 | Pantone 648 C |
| **Verde** | Cor auxiliar | `#19cb96` | 25, 203, 150 | Pantone 7479 C |
| **Preto** | Textos / contraste | `#050006` | 5, 0, 6 | Pantone Black 6 C |
| **Branco** | Fundos, legibilidade | — | — | Aplicação sobre preto, branco, azul e verde apenas |

- Marca **somente** sobre fundos: preto, branco, azul e verde institucional.
- Em cinza: versão positiva até 40%; acima disso usar versão negativa (traço branco).

### Tipografia
- **Títulos:** Titillium Web (primária)
- **Corpo / textos longos:** Poppins (secundária)

### Logo
- **Versão preferencial:** vertical (símbolo acima do nome "soluções inteligentes").
- **Versão auxiliar:** horizontal (símbolo à esquerda do nome).
- **Versão negativa:** para fundos escuros (50–100%).
- **Tamanhos mínimos:** 15 mm largura (vertical), 20 mm (horizontal).

### Assets de marca (SVGs)
- **Localização:** `/Users/suporte/Documents/Sintel/`
- **Arquivos:**  
  `AZUL (3).svg`, `AZUL (4).svg`, `BRANCO (2).svg`, `BRANCO (3).svg`, `Verde (2).svg`, `VERDE (3).svg`, `PRETO (2).svg`, `PRETO (3).svg`
- Usar conforme aplicação (fundo azul/verde/branco/preto) e versão vertical/horizontal conforme Manual.

---

## 3. Serviços e equipamentos (contexto do negócio)

- **Serviços:** Manutenção de notebooks e PCs, upgrade e formatação, redes, suporte remoto/presencial, CFTV, serviços elétricos, porteiro eletrônico.
- **Venda:** Notebooks, PC corporativo, PC gamer, periféricos, estabilizadores/nobreaks, caixas de som, projetores, tablet.
- **Contato (referência):** (21) 96531-8993 (WhatsApp), @solucoesinteligentes_si (Instagram).

---

## 4. Lógica primeiro (antes de qualquer tela)

**Princípio:** Estruturar **toda a lógica** do sistema antes de desenhar ou implementar telas.

### O que entra na “lógica”

| Camada | Conteúdo | Responsável |
|--------|----------|-------------|
| **Requisitos** | O quê o sistema deve fazer; cenários; regras de negócio em linguagem de domínio | @analyst |
| **Produto / escopo** | PRD, épicos, priorização, critérios de aceitação (sem desenho de tela) | @pm |
| **Modelo de dados** | Entidades (Serviço, Cliente, Status, etc.), relacionamentos, campos obrigatórios | @architect |
| **Regras de negócio** | Estados do serviço, quem pode fazer o quê (dono x cliente), validações | @architect |
| **Fluxos** | Registro de serviço, mudança de status, notificações, acompanhamento cliente | @architect |
| **APIs / contrato** | Endpoints, payloads, autenticação e autorização (dono x cliente) | @architect |

### Ordem recomendada (só lógica)

1. **@analyst** → Requisitos e cenários (personas, fluxos em texto, regras em alto nível).
2. **@pm** → PRD e épicos (escopo e prioridade; sem wireframes).
3. **@architect** → Modelo de dados + regras de negócio + fluxos + APIs (documento de arquitetura / spec da lógica).

**Só depois** de aprovada a lógica:

4. **@ux-design-expert** → Telas e experiência (layout, marca, fluxos de interface).
5. **@sm** + **@dev** → Stories e implementação (telas + integração com a lógica já definida).
6. **@qa** → Revisão e testes.

### Checklist “Lógica pronta”

- [ ] Requisitos e cenários documentados (@analyst)
- [ ] PRD e épicos aprovados (@pm)
- [ ] Modelo de dados (entidades e relacionamentos) definido (@architect)
- [ ] Regras de negócio e estados do serviço documentados (@architect)
- [ ] Fluxos principais descritos (registro, status, acompanhamento) (@architect)
- [ ] APIs/contrato (endpoints, auth) especificados (@architect)
- [ ] **Só então:** iniciar desenho de telas e desenvolvimento

---

## 5. Plano de orquestração – próximos passos

Ordem sugerida (lógica primeiro, telas depois):

| Fase | Agente | Foco |
|------|--------|------|
| **Lógica 1** | @analyst | Requisitos, cenários, personas, regras em alto nível |
| **Lógica 2** | @pm | PRD, épicos, priorização (sem UI) |
| **Lógica 3** | @architect | Modelo de dados, regras de negócio, fluxos, APIs |
| **Telas** | @ux-design-expert | Layout, marca, fluxos de tela |
| **Build** | @sm + @dev | Stories e implementação |
| **Qualidade** | @qa | Revisão e testes |

---

## 6. Como usar este brief

- **Passo 1 – Estruturar requisitos:** Chame **@analyst** e envie:  
  *“Quero estruturar toda a lógica antes das telas. Use o brief em projetos/solucoes-inteligentes/BRIEF-PROJETO-SITE-SI.md. Detalhe requisitos, cenários e regras de negócio em alto nível para: visão dono (registro/gestão de serviços) e visão cliente (acompanhamento). Sem desenho de tela ainda.”*

- **Passo 2 – PRD e escopo:** Com o resultado do analyst, chame **@pm** e peça PRD e épicos para o site (escopo e prioridade, ainda sem UI).

- **Passo 3 – Arquitetura da lógica:** Chame **@architect** com o PRD e peça: modelo de dados (entidades, relacionamentos), regras de negócio, fluxos (registro, status, acompanhamento) e especificação de APIs/contrato. Só depois disso partimos para telas.

- **Depois que a lógica estiver aprovada:** Chame **@ux-design-expert** para layout e telas conforme a marca; em seguida **@sm** / **@dev** para implementação.

---

*Documento gerado por @aios-master para orquestração do projeto Site Soluções Inteligentes.*
