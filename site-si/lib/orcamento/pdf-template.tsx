import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";


const NAVY = "#122969";
const GRAY = "#555555";
const LIGHT_GRAY = "#888888";

const s = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 30,
    paddingBottom: 70,
    paddingHorizontal: 50,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333333",
  },
  logo: {
    width: 220,
    marginBottom: 30,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    marginBottom: 16,
  },
  labelBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#333333",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#333333",
    marginTop: 20,
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 4,
  },
  valueLabelBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  valueAmount: {
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  obs: {
    marginTop: 16,
    fontSize: 10,
    color: "#333333",
    lineHeight: 1.6,
  },
  proposalBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 10,
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 48,
    alignItems: "flex-end",
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: "#333333",
    width: 200,
    paddingTop: 4,
    fontSize: 10,
    color: "#333333",
  },
  carimbo: {
    width: 160,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#122969",
    paddingVertical: 10,
    paddingHorizontal: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    color: "#ffffff",
    fontSize: 7.5,
    lineHeight: 1.6,
  },
  footerRight: {
    color: "#ffffff",
    fontSize: 7.5,
    textAlign: "right",
    lineHeight: 1.6,
  },
  footerIcons: {
    color: "#ffffff",
    fontSize: 7.5,
    textAlign: "center",
    lineHeight: 1.6,
  },
});

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export interface OrcamentoPDFProps {
  clienteNome?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  descricao?: string;
  valor: number;
  metodo: string;
  parcelas: number;
  valorParcela: number;
  logoPath: string;
  carimboPath: string;
}

export function OrcamentoPDFDocument({
  clienteNome,
  clienteEmail,
  clienteTelefone,
  descricao,
  valor,
  metodo,
  parcelas,
  valorParcela,
  logoPath,
  carimboPath,
}: OrcamentoPDFProps) {
  const hoje = formatDate(new Date());

  const isAVista = metodo === "avista";
  const valorLabel = isAVista
    ? "Valor do serviço (à Vista)"
    : `Valor do serviço (${parcelas}× de ${formatBRL(valorParcela)})`;
  const valorDisplay = isAVista
    ? formatBRL(valor)
    : formatBRL(valor);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Logo */}
        <Image src={logoPath} style={s.logo} />

        <View style={s.divider} />

        {/* Dados do cliente */}
        <View style={{ marginBottom: 4 }}>
          <View style={s.row}>
            <Text style={s.labelBold}>Data: </Text>
            <Text>{hoje}</Text>
          </View>
          {!!clienteNome && (
            <>
              <View style={s.row}>
                <Text style={s.labelBold}>Cliente: </Text>
                <Text> {clienteNome}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.labelBold}>E-mail: </Text>
                <Text> {clienteEmail || ""}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.labelBold}>Telefone: </Text>
                <Text> {clienteTelefone || ""}</Text>
              </View>
            </>
          )}
        </View>

        {/* Descrição do serviço */}
        {!!descricao && (
          <>
            <Text style={s.sectionTitle}>Descrição do Serviço</Text>
            <Text style={{ fontSize: 10, lineHeight: 1.5 }}>{descricao}</Text>
          </>
        )}

        {/* Valor */}
        <View style={s.valueRow}>
          <Text style={s.valueLabelBold}>{valorLabel}</Text>
          <Text style={s.valueAmount}>{valorDisplay}</Text>
        </View>

        {/* Observações fixas */}
        <View style={s.obs}>
          <Text>Obs.;</Text>
          <Text>Garantia do serviço efetuada válida por 90 dias.</Text>
          <Text>Todo material incluso.</Text>
        </View>

        <Text style={s.proposalBold}>Proposta válida por 15 dias.</Text>

        {/* Assinaturas */}
        <View style={s.signaturesRow}>
          <View>
            <View style={s.sigLine} />
            <Text style={{ fontSize: 10, marginTop: 2 }}>Cliente</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Image src={carimboPath} style={s.carimbo} />
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerLeft}>Infotec Soluções Inteligentes LTDA</Text>
            <Text style={s.footerLeft}>Rua Dona Lídia, 30 - Pilares - Rio de Janeiro - CEP: 20750-120</Text>
          </View>
          <View>
            <Text style={s.footerIcons}>@solucoesinteligentes_si   (21) 96531-8993   solucoesinteligentes.si@gmail.com</Text>
          </View>
          <View>
            <Text style={s.footerRight}>CNPJ: 20.273.228/0001-62</Text>
            <Text style={s.footerRight}>Tel.: (21) 96531-8993</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
