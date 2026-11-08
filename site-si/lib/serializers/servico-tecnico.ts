import { Prisma } from "@prisma/client";

/**
 * Select fixo para tudo que a rota /api/tecnicos/me/* lê do banco. Nível 1
 * de defesa contra vazamento: o dado financeiro nem sai do Postgres.
 *
 * NUNCA importar lib/lucro.ts nem usar `include`/`select: true` genérico em
 * nenhum arquivo sob app/api/tecnicos/me/ ou app/tecnico/ — o técnico só
 * pode ver o próprio valorRepasse, nunca valorEstimado, valorMaterial,
 * custoFixo, valorGarantia, taxaPercentual, impostoPercentual,
 * lucroPretendido, formaPagamento ou dados de outro técnico.
 */
export const SELECT_SERVICO_TECNICO = {
  id: true,
  codigo: true,
  descricao: true,
  tipoServico: true,
  statusAtual: true,
  dataAbertura: true,
  dataAgendamento: true,
  prazoEstimado: true,
  dataConclusao: true,
  dataReagendamentoProposta: true,
  motivoReagendamento: true,
  comprovanteRepasseUrl: true,
  comprovanteRepasseNomeArquivo: true,
  comprovantesMaterial: true,
  enderecoServico: true,
  contatoPreferencial: true,
  valorRepasse: true,
  repasseProposto: true,
  repassePropostoOrigem: true,
  repassePropostoObs: true,
  categoria: { select: { nome: true } },
  cliente: {
    select: { nome: true, nomeContato: true, telefone: true, logradouro: true, bairro: true, cidade: true, uf: true, cep: true },
  },
} satisfies Prisma.ServicoSelect;

type ServicoParaTecnico = Prisma.ServicoGetPayload<{ select: typeof SELECT_SERVICO_TECNICO }>;

/**
 * Nível 2 de defesa: monta o objeto de saída campo a campo (allowlist).
 * Nunca usar spread do registro Prisma nem `delete obj.campo` — um campo
 * novo no model Servico nasce invisível aqui por padrão, em vez de vazar.
 */
export function serializeServicoParaTecnico(s: ServicoParaTecnico) {
  return {
    id: s.id,
    codigo: s.codigo,
    descricao: s.descricao,
    tipoServico: s.tipoServico,
    statusAtual: s.statusAtual,
    dataAbertura: s.dataAbertura,
    dataAgendamento: s.dataAgendamento,
    prazoEstimado: s.prazoEstimado,
    dataConclusao: s.dataConclusao,
    dataReagendamentoProposta: s.dataReagendamentoProposta,
    motivoReagendamento: s.motivoReagendamento,
    comprovanteRepasseUrl: s.comprovanteRepasseUrl,
    comprovanteRepasseNomeArquivo: s.comprovanteRepasseNomeArquivo,
    comprovantesMaterial: s.comprovantesMaterial ? (JSON.parse(s.comprovantesMaterial) as string[]) : [],
    enderecoServico: s.enderecoServico,
    contatoPreferencial: s.contatoPreferencial,
    valorRepasse: s.valorRepasse,
    repasseProposto: s.repasseProposto,
    repassePropostoOrigem: s.repassePropostoOrigem,
    repassePropostoObs: s.repassePropostoObs,
    categoria: s.categoria?.nome ?? null,
    cliente: {
      nome: s.cliente.nome,
      nomeContato: s.cliente.nomeContato,
      telefone: s.cliente.telefone,
      logradouro: s.cliente.logradouro,
      bairro: s.cliente.bairro,
      cidade: s.cliente.cidade,
      uf: s.cliente.uf,
      cep: s.cliente.cep,
    },
  };
}
