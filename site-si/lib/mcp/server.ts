import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { chamarRota, type ChamadaRota } from "@/lib/mcp/chamar-rota";

import * as servicos from "@/app/api/servicos/route";
import * as servicoId from "@/app/api/servicos/[id]/route";
import * as servicoStatus from "@/app/api/servicos/[id]/status/route";
import * as servicoNotas from "@/app/api/servicos/[id]/notas/route";
import * as servicoLink from "@/app/api/servicos/[id]/link-cliente/route";
import * as reagAprovar from "@/app/api/servicos/[id]/reagendamento/aprovar/route";
import * as reagRecusar from "@/app/api/servicos/[id]/reagendamento/recusar/route";
import * as repasseNegociacao from "@/app/api/servicos/[id]/repasse/route";
import * as servicosContagem from "@/app/api/servicos/contagem/route";
import * as clientes from "@/app/api/clientes/route";
import * as clienteId from "@/app/api/clientes/[id]/route";
import * as tecnicos from "@/app/api/tecnicos/route";
import * as tecnicoId from "@/app/api/tecnicos/[id]/route";
import * as categorias from "@/app/api/categorias/route";
import * as categoriaId from "@/app/api/categorias/[id]/route";
import * as usuarios from "@/app/api/usuarios/route";
import * as usuarioId from "@/app/api/usuarios/[id]/route";
import * as agendaEvents from "@/app/api/agenda/events/route";
import * as agendaEventId from "@/app/api/agenda/events/[id]/route";
import * as resumo from "@/app/api/financeiro/resumo/route";
import * as rbt12 from "@/app/api/financeiro/rbt12/route";
import * as obrigacoes from "@/app/api/contabilidade/obrigacoes/route";
import * as obrigacaoId from "@/app/api/contabilidade/obrigacoes/[id]/route";
import * as obrigacaoCom from "@/app/api/contabilidade/obrigacoes/[id]/comentarios/route";
import * as obrigacaoSync from "@/app/api/contabilidade/obrigacoes/[id]/sync-calendario/route";
import * as conhecimento from "@/app/api/contabilidade/conhecimento/route";
import * as conhecimentoId from "@/app/api/contabilidade/conhecimento/[id]/route";
import * as docs from "@/app/api/documentos-fiscais/route";
import * as docId from "@/app/api/documentos-fiscais/[id]/route";
import * as docReprocessar from "@/app/api/documentos-fiscais/[id]/reprocessar/route";
import * as docKpis from "@/app/api/documentos-fiscais/kpis/route";
import * as empresas from "@/app/api/empresas-fiscais/route";
import * as empresaId from "@/app/api/empresas-fiscais/[id]/route";

type Metodo = "GET" | "POST" | "PATCH" | "DELETE";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, ctx: any) => Promise<Response> | Response;
type Modulo = Partial<Record<Metodo, Handler>>;

const dados = z.record(z.string(), z.unknown());
const confirmar = z
  .boolean()
  .optional()
  .describe("Gravar de verdade. Só envie true depois de o usuário autorizar a ação mostrada na prévia.");

function texto(obj: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }] };
}

export function criarServidorSI(): McpServer {
  const server = new McpServer({ name: "solucoes-inteligentes", version: "1.0.0" });

  /** Ferramenta de consulta: executa direto. */
  function leitura(
    nome: string,
    descricao: string,
    mod: Modulo,
    montar: (a: Record<string, unknown>) => Omit<ChamadaRota, "method">,
    shape: z.ZodRawShape = {}
  ) {
    server.registerTool(nome, { description: descricao, inputSchema: shape }, async (args: Record<string, unknown>) => {
      const r = await chamarRota(mod.GET as Handler, { method: "GET", ...montar(args) });
      return texto(r);
    });
  }

  /** Ferramenta que altera dados: sem `confirmar: true` devolve só a prévia. */
  function escrita(
    nome: string,
    descricao: string,
    metodo: Exclude<Metodo, "GET">,
    mod: Modulo,
    montar: (a: Record<string, unknown>) => Omit<ChamadaRota, "method">,
    shape: z.ZodRawShape,
    destrutiva = false
  ) {
    const aviso = destrutiva
      ? " AÇÃO DESTRUTIVA E IRREVERSÍVEL: mostre ao usuário exatamente o que será excluído e só chame com confirmar=true após autorização explícita."
      : " Chame primeiro SEM `confirmar` para mostrar a prévia ao usuário; só depois da autorização chame com `confirmar: true`.";
    server.registerTool(
      nome,
      { description: descricao + aviso, inputSchema: { ...shape, confirmar } },
      async (args: Record<string, unknown>) => {
        const chamada: ChamadaRota = { method: metodo, ...montar(args) };
        if (!args.confirmar) {
          return texto({
            previa: true,
            aviso: "Nada foi gravado. Repita a chamada com confirmar=true após o usuário autorizar.",
            acao: { metodo, caminho: chamada.path, corpo: chamada.body ?? null },
          });
        }
        return texto(await chamarRota(mod[metodo] as Handler, chamada));
      }
    );
  }

  const id = { id: z.string().describe("ID (cuid) do registro") };
  const idServ = { id: z.string().describe("ID ou código do serviço") };
  const consulta = { filtros: z.record(z.string(), z.string()).optional().describe("Filtros da listagem (query string)") };
  const lista = (path: string) => (a: Record<string, unknown>) => ({
    path,
    query: a.filtros as Record<string, string> | undefined,
  });

  // ---------- Serviços ----------
  leitura(
    "listar_servicos",
    "Lista serviços. Filtros: status, cliente_id, data_inicio, data_fim, q (código/cliente/e-mail/telefone).",
    servicos,
    lista("/api/servicos"),
    consulta
  );
  leitura("detalhar_servico", "Detalhes completos de um serviço (histórico, notas, financeiro).", servicoId, (a) => ({
    path: `/api/servicos/${a.id}`,
    params: { id: String(a.id) },
  }), idServ);
  leitura("contagem_servicos", "Contagem de serviços por status.", servicosContagem, () => ({ path: "/api/servicos/contagem" }));
  leitura("gerar_link_cliente", "Gera o link de acompanhamento do cliente para um serviço.", servicoLink, (a) => ({
    path: `/api/servicos/${a.id}/link-cliente`,
    params: { id: String(a.id) },
  }), idServ);
  escrita(
    "criar_servico",
    "Cria serviço. Em `dados`: id_cliente OU cliente{nome,email,telefone}; categoria_id e descricao (obrigatórios); " +
      "data_agendamento, valor_estimado, valor_material, valor_repasse, custo_fixo, valor_garantia, forma_pagamento, " +
      "parcelas, imposto_percentual, tecnico_id. Taxa e imposto são calculados pelo servidor.",
    "POST",
    servicos,
    (a) => ({ path: "/api/servicos", body: a.dados }),
    { dados }
  );
  escrita("atualizar_servico", "Atualiza campos de um serviço (mesmos nomes de campo da API).", "PATCH", servicoId, (a) => ({
    path: `/api/servicos/${a.id}`,
    params: { id: String(a.id) },
    body: a.dados,
  }), { ...idServ, dados });
  escrita(
    "mudar_status_servico",
    "Muda o status de um serviço (transições validadas pelo servidor).",
    "PATCH",
    servicoStatus,
    (a) => ({ path: `/api/servicos/${a.id}/status`, params: { id: String(a.id) }, body: a.dados }),
    { ...idServ, dados: dados.describe("{ status_novo, ... }") }
  );
  escrita("adicionar_nota_servico", "Adiciona nota ao serviço: { conteudo, visivel_cliente? }.", "POST", servicoNotas, (a) => ({
    path: `/api/servicos/${a.id}/notas`,
    params: { id: String(a.id) },
    body: a.dados,
  }), { ...idServ, dados });
  escrita("aprovar_reagendamento", "Aprova o reagendamento proposto pelo técnico.", "POST", reagAprovar, (a) => ({
    path: `/api/servicos/${a.id}/reagendamento/aprovar`,
    params: { id: String(a.id) },
    body: a.dados ?? {},
  }), { ...idServ, dados: dados.optional() });
  escrita("recusar_reagendamento", "Recusa o reagendamento proposto pelo técnico.", "POST", reagRecusar, (a) => ({
    path: `/api/servicos/${a.id}/reagendamento/recusar`,
    params: { id: String(a.id) },
    body: a.dados ?? {},
  }), { ...idServ, dados: dados.optional() });
  escrita(
    "negociar_repasse",
    "Negocia o repasse ao técnico. Em `dados`: acao = aprovar (aceita a proposta do técnico) | recusar | contrapropor (exige valor; observacao opcional).",
    "POST",
    repasseNegociacao,
    (a) => ({ path: `/api/servicos/${a.id}/repasse`, params: { id: String(a.id) }, body: a.dados }),
    { ...idServ, dados }
  );
  escrita("excluir_servico", "Exclui um serviço.", "DELETE", servicoId, (a) => ({
    path: `/api/servicos/${a.id}`,
    params: { id: String(a.id) },
  }), idServ, true);

  // ---------- CRUD simples por domínio ----------
  type Crud = {
    singular: string;
    plural: string;
    base: string;
    lista: Modulo;
    item: Modulo;
    filtros: string;
    excluir?: boolean;
    detalhe?: boolean;
  };
  const cruds: Crud[] = [
    { singular: "cliente", plural: "clientes", base: "/api/clientes", lista: clientes, item: clienteId, filtros: "q", excluir: false },
    { singular: "tecnico", plural: "tecnicos", base: "/api/tecnicos", lista: tecnicos, item: tecnicoId, filtros: "", detalhe: false, excluir: true },
    { singular: "categoria", plural: "categorias", base: "/api/categorias", lista: categorias, item: categoriaId, filtros: "", excluir: true },
    { singular: "usuario", plural: "usuarios", base: "/api/usuarios", lista: usuarios, item: usuarioId, filtros: "q", detalhe: false, excluir: true },
    { singular: "obrigacao_contabil", plural: "obrigacoes_contabeis", base: "/api/contabilidade/obrigacoes", lista: obrigacoes, item: obrigacaoId, filtros: "status, tipo", excluir: true },
    { singular: "artigo_conhecimento", plural: "artigos_conhecimento", base: "/api/contabilidade/conhecimento", lista: conhecimento, item: conhecimentoId, filtros: "q, categoria", excluir: true },
    { singular: "documento_fiscal", plural: "documentos_fiscais", base: "/api/documentos-fiscais", lista: docs, item: docId, filtros: "empresaId, tipo, busca, statusPagamento, page", excluir: true },
    { singular: "empresa_fiscal", plural: "empresas_fiscais", base: "/api/empresas-fiscais", lista: empresas, item: empresaId, filtros: "", excluir: false },
  ];

  for (const c of cruds) {
    const f = c.filtros ? ` Filtros: ${c.filtros}.` : "";
    leitura(`listar_${c.plural}`, `Lista ${c.plural.replace(/_/g, " ")}.${f}`, c.lista, lista(c.base), consulta);
    if (c.detalhe !== false && c.item.GET) {
      leitura(`detalhar_${c.singular}`, `Detalhes de ${c.singular.replace(/_/g, " ")}.`, c.item, (a) => ({
        path: `${c.base}/${a.id}`,
        params: { id: String(a.id) },
      }), id);
    }
    if (c.lista.POST) {
      escrita(`criar_${c.singular}`, `Cria ${c.singular.replace(/_/g, " ")}. Envie em \`dados\` os campos aceitos pela API.`, "POST", c.lista, (a) => ({
        path: c.base,
        body: a.dados,
      }), { dados });
    }
    if (c.item.PATCH) {
      escrita(`atualizar_${c.singular}`, `Atualiza ${c.singular.replace(/_/g, " ")}. Envie em \`dados\` só os campos a alterar.`, "PATCH", c.item, (a) => ({
        path: `${c.base}/${a.id}`,
        params: { id: String(a.id) },
        body: a.dados,
      }), { ...id, dados });
    }
    if (c.excluir && c.item.DELETE) {
      escrita(`excluir_${c.singular}`, `Exclui ${c.singular.replace(/_/g, " ")}.`, "DELETE", c.item, (a) => ({
        path: `${c.base}/${a.id}`,
        params: { id: String(a.id) },
      }), id, true);
    }
  }

  // ---------- Extras ----------
  leitura("resumo_financeiro", "Resumo financeiro de 12 meses (receita, repasse, taxa, imposto, lucro operacional e líquido).", resumo, () => ({ path: "/api/financeiro/resumo" }));
  leitura("rbt12", "Receita bruta dos últimos 12 meses e alíquota efetiva do Simples.", rbt12, () => ({ path: "/api/financeiro/rbt12" }));
  leitura("listar_eventos_agenda", "Lista eventos da agenda. Filtros conforme a API (ex.: from, to).", agendaEvents, lista("/api/agenda/events"), consulta);
  escrita("atualizar_evento_agenda", "Atualiza/reagenda um evento da agenda.", "PATCH", agendaEventId, (a) => ({
    path: `/api/agenda/events/${a.id}`,
    params: { id: String(a.id) },
    body: a.dados,
  }), { ...id, dados });
  leitura("kpis_fiscais", "KPIs dos documentos fiscais.", docKpis, lista("/api/documentos-fiscais/kpis"), consulta);
  escrita("reprocessar_documento_fiscal", "Reprocessa a extração de um documento fiscal.", "POST", docReprocessar, (a) => ({
    path: `/api/documentos-fiscais/${a.id}/reprocessar`,
    params: { id: String(a.id) },
    body: a.dados ?? {},
  }), { ...id, dados: dados.optional() });
  leitura("listar_comentarios_obrigacao", "Lista comentários de uma obrigação contábil.", obrigacaoCom, (a) => ({
    path: `/api/contabilidade/obrigacoes/${a.id}/comentarios`,
    params: { id: String(a.id) },
  }), id);
  escrita("comentar_obrigacao", "Comenta numa obrigação contábil: { texto }.", "POST", obrigacaoCom, (a) => ({
    path: `/api/contabilidade/obrigacoes/${a.id}/comentarios`,
    params: { id: String(a.id) },
    body: a.dados,
  }), { ...id, dados });
  escrita("sincronizar_obrigacao_calendario", "Envia a obrigação contábil ao Google Calendar.", "POST", obrigacaoSync, (a) => ({
    path: `/api/contabilidade/obrigacoes/${a.id}/sync-calendario`,
    params: { id: String(a.id) },
    body: {},
  }), id);

  return server;
}
