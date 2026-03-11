# Telas e Fluxos – Site Soluções Inteligentes (SI)

**Documento:** Especificação de telas, fluxos de interface e aplicação da marca (sem código)  
**Fontes:** BRIEF-PROJETO-SITE-SI.md, PRD, ARQUITETURA-LOGICA-SITE-SI.md  
**Responsável:** @ux-design-expert (Uma)  
**Data:** 2026-03-01

---

## 1. Design tokens (marca SI)

Usar em todo o site. **Nenhum valor hardcoded**; tokens definem a identidade.

| Token | Uso | Valor | Observação |
|-------|-----|--------|-------------|
| `color-primary` | Azul institucional (botões principais, header, links) | `#122969` | Pantone 648 C |
| `color-secondary` | Verde (destaques, sucesso, CTAs secundários) | `#19cb96` | Pantone 7479 C |
| `color-text` | Texto principal | `#050006` | Preto |
| `color-bg` | Fundos claros | `#ffffff` | Branco |
| `color-bg-alt` | Fundos alternativos (cards, seções) | `#122969` ou `#f5f5f5` | Azul suave ou cinza muito claro (<40% para manter marca) |
| `font-heading` | Títulos | Titillium Web | Google Fonts |
| `font-body` | Corpo, formulários, listas | Poppins | Google Fonts |
| `radius-sm/md/lg` | Bordas (botões, cards, inputs) | Definir escala (ex.: 4px, 8px, 12px) | Consistência |
| `shadow-card` | Sombra de cards | Leve, acessível | Evitar sombras pesadas (Manual de Marca) |

**Logo:** Versão vertical (símbolo acima do nome) em header claro; versão horizontal em espaços estreitos. Em fundo azul/verde escuro usar versão em branco (negativa). Assets em `/Users/suporte/Documents/Sintel/` (AZUL, BRANCO, VERDE conforme fundo).

**Restrições:** Não usar fundos coloridos fora de preto, branco, azul e verde. Não distorcer logo nem usar fontes diferentes das acima.

---

## 2. Visão dono (painel interno)

### 2.1 Fluxo geral

```
[Login dono] → [Dashboard / Lista de serviços] ⇄ [Detalhe do serviço]
                    ↓
              [Cadastro de cliente] → [Lista clientes]
              [Novo serviço] (vincula cliente existente ou novo)
```

### 2.2 Telas

| Tela | Objetivo | Elementos principais |
|------|----------|----------------------|
| **Login dono** | Autenticação (e-mail + senha). | Logo SI; campo e-mail; campo senha; botão "Entrar"; link "Esqueci a senha" (se aplicável). Fundo claro (branco ou azul muito suave); logo em azul. |
| **Dashboard / Lista de serviços** | Ver todos os serviços; filtrar e buscar. | Header com logo e "Sair"; título "Serviços"; filtros (status, período, cliente); busca (código/nome); tabela ou cards (código, cliente, tipo, status, data abertura); botão "Novo serviço"; ao clicar em linha/card → Detalhe do serviço. |
| **Novo serviço** | Criar serviço (cliente + tipo + descrição + opcionais). | Formulário: seleção de cliente (busca/select) ou "Cadastrar novo cliente" (nome, email, telefone, endereço opcional); tipo de serviço (select lista fixa); descrição (textarea); data abertura (default hoje); opcionais: prazo, valor, endereço do serviço. Botões "Cancelar" e "Criar serviço". Após criar: redirecionar para Detalhe do serviço e exibir "Link para o cliente" (copiar). |
| **Cadastro de cliente (standalone)** | Cadastrar cliente fora do fluxo de serviço. | Formulário: nome, email, telefone, endereço (opcional). Validação: email e telefone únicos. Botões "Cancelar" e "Salvar". |
| **Lista de clientes** | Buscar e escolher cliente ao criar serviço; ver clientes cadastrados. | Busca; lista (nome, email, telefone); botão "Novo cliente"; ao selecionar → usar no formulário de novo serviço. |
| **Detalhe do serviço** | Ver dados do serviço, histórico de status e notas; alterar status; adicionar nota. | Cabeçalho: código, cliente, tipo, status atual (badge). Botão "Alterar status" (dropdown ou modal com transições permitidas). Seção "Linha do tempo": lista cronológica (data/hora, status anterior → novo, autor; e notas com indicador "interno" ou "visível ao cliente"). Formulário "Nova nota" (textarea + checkbox "Visível ao cliente"). Botão "Gerar/copiar link para cliente". Navegação de volta para Lista de serviços. |

### 2.3 Componentes reutilizáveis (sugestão atômica)

- **Header painel:** Logo + título da área + "Sair".
- **Card serviço:** código, cliente, tipo, status (badge colorido por status), data.
- **Badge status:** cor por status (ex.: Aberto=azul, Em andamento=verde, Concluído=cinza, Cancelado=vermelho suave).
- **Linha do tempo:** item com data, ícone, texto (mudança de status ou nota); nota interna com indicador visual distinto.
- **Formulário cliente:** nome, email, telefone, endereço; validação em tempo real (email/telefone únicos).
- **Formulário serviço:** cliente (select/busca), tipo (select), descrição, datas/opcionais.

---

## 3. Visão cliente (área de acompanhamento)

### 3.1 Fluxo geral

```
[Acesso por link + token] → [Lista "Meus serviços"] → [Detalhe do serviço]
                              (somente leitura)
```

Não há login com senha no MVP; cliente abre o link recebido (ex.: WhatsApp) e vê diretamente a lista.

### 3.2 Telas

| Tela | Objetivo | Elementos principais |
|------|----------|----------------------|
| **Acompanhamento (lista)** | Cliente vê seus serviços. | Header com logo SI (sem "Sair" ou painel); título "Seus serviços" ou "Acompanhe seu atendimento"; lista de cards (código, tipo, status atual, data abertura); ao clicar → Detalhe. Sem botões de edição. |
| **Detalhe do serviço (cliente)** | Ver status atual e linha do tempo (apenas mudanças de status e notas visíveis ao cliente). | Cabeçalho: código, tipo, status atual (badge). Uma única seção: "Linha do tempo" – itens cronológicos (data, mudança de status; e mensagens marcadas como visíveis). Sem formulários; sem "Alterar status"; sem notas internas. Voltar para lista. |

### 3.3 Componentes reutilizáveis (cliente)

- **Header cliente:** Apenas logo SI e título "Acompanhe seu atendimento".
- **Card serviço (cliente):** código, tipo, status, data; só leitura.
- **Linha do tempo (cliente):** mesmo conceito que no painel, mas filtrando apenas eventos e notas visíveis ao cliente.

---

## 4. Página pública (opcional no MVP)

| Tela | Objetivo | Observação |
|------|----------|------------|
| **Landing / Home** | Página institucional da SI (serviços, contato). | Pode ser estática; link "Acompanhar meu serviço" leva à entrada do link+token (ex.: campo para colar token ou URL direta). Se MVP não incluir landing, o link do cliente já abre direto na lista. |

---

## 5. Responsividade e acessibilidade

- **Breakpoints:** Mobile first; tabelas do dono em desktop podem virar cards em mobile.
- **Toque:** Áreas clicáveis ≥ 44px; espaçamento entre links adequado.
- **Contraste:** Texto preto (#050006) em fundo branco; azul/verde em fundos que garantam WCAG AA (verificar contraste do verde em fundo branco).
- **Foco:** Indicador de foco visível em todos os controles (botões, inputs, links).
- **Labels:** Todos os inputs com label associado; erros de validação anunciados.

---

## 6. Resumo para implementação

- **Dono:** Login → Dashboard (lista serviços) → Novo serviço / Detalhe serviço (status, notas, link cliente). Lista/cadastro de clientes.
- **Cliente:** Link+token → Lista "Meus serviços" → Detalhe (só leitura, linha do tempo).
- **Marca:** Tokens acima (cores, fontes); logo conforme Manual; sem cores fora da paleta.
- **Componentes:** Header, Card serviço, Badge status, Linha do tempo, Formulários cliente e serviço; variantes dono vs cliente onde necessário.

---

*Documento gerado por @ux-design-expert (Uma). Telas e fluxos – implementação em código com @dev.*
