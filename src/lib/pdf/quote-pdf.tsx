import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { companyData } from "@/lib/company-data";
import { formatCurrencyValue, formatDate } from "@/lib/formatters";
import type { ParsedQuoteInput } from "@/lib/quotes/quote-input";
import { fetchOptimizedPdfImage, type PdfImageSource } from "./pdf-image";

const BRAND_BLUE = "#1F5B85";
const MUTED_TEXT = "#667085";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 42,
    paddingHorizontal: 34,
    color: "#222222",
    fontFamily: "Helvetica",
    fontSize: 8.5,
    lineHeight: 1.35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND_BLUE,
    paddingBottom: 11,
    marginBottom: 13,
  },
  company: { width: "66%" },
  companyName: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
    letterSpacing: 0.1,
  },
  systemName: {
    fontSize: 6.3,
    color: MUTED_TEXT,
    marginBottom: 9,
    letterSpacing: 0.9,
  },
  companyLine: { marginBottom: 2, color: "#475467" },
  quoteIdentity: { width: "32%", alignItems: "flex-end" },
  logo: { width: 70, height: 62, objectFit: "contain", marginBottom: 5 },
  quoteTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  quoteDate: { fontSize: 8.5, marginTop: 3, color: MUTED_TEXT },
  clientBox: {
    borderWidth: 0.7,
    borderColor: "#98A2B3",
    backgroundColor: "#FBFCFD",
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 13,
  },
  clientLabel: {
    fontSize: 6.2,
    color: MUTED_TEXT,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  clientName: { fontFamily: "Helvetica-Bold", marginBottom: 2, textTransform: "uppercase" },
  clientLine: { marginBottom: 1.5 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
    marginBottom: 9,
  },
  item: { borderBottomWidth: 0.6, borderBottomColor: "#D0D5DD", paddingBottom: 11, marginBottom: 12 },
  itemLayout: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  itemMain: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  itemTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 7, textTransform: "uppercase" },
  itemBody: { flexDirection: "row", gap: 11 },
  itemImage: {
    width: 80,
    height: 80,
    objectFit: "contain",
    padding: 1,
    borderWidth: 0.45,
    borderColor: "#E4E7EC",
  },
  itemDetails: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  detailLine: { marginBottom: 2 },
  dimensionRow: { marginBottom: 2 },
  dimensionLabel: { flexShrink: 1 },
  itemPrices: { width: 190, flexShrink: 0, alignItems: "flex-end" },
  priceLine: { width: "100%", marginBottom: 2, textAlign: "right" },
  itemTotal: { width: "100%", marginTop: 2, fontFamily: "Helvetica-Bold", textAlign: "right" },
  summary: { borderTopWidth: 1.5, borderTopColor: "#111111", paddingTop: 11, marginTop: 9 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 20 },
  conditions: { flexGrow: 1, flexShrink: 1 },
  condition: { marginBottom: 3 },
  conditionLabel: { fontFamily: "Helvetica-Bold" },
  totals: { minWidth: 170, alignItems: "flex-end" },
  discount: { color: "#b42318", marginBottom: 5 },
  grandTotal: { borderWidth: 1.5, borderColor: "#111111", paddingVertical: 8, paddingHorizontal: 10, fontSize: 12, fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 11, padding: 8, backgroundColor: "#F8F9FB", borderWidth: 0.5, borderColor: "#D0D5DD" },
  notesTitle: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  signatures: { flexDirection: "row", gap: 34, marginTop: 44 },
  signatureBlock: { flexGrow: 1, flexBasis: 0, borderTopWidth: 0.7, borderTopColor: "#111111" },
  signatureName: { width: "100%", paddingTop: 4, textAlign: "center", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 18, left: 34, right: 34, textAlign: "center", color: "#777777", fontSize: 7 },
});

function money(value: number): string {
  return `R$ ${formatCurrencyValue(value)}`;
}

function measurement(value: number | null): string {
  return value === null ? "—" : String(value).replace(".", ",");
}

function measurementWithUnit(value: number | null): string {
  return value === null ? "—" : `${measurement(value)} mm`;
}

function dimensionMeasurement(width: number | null, height: number | null): string {
  if (width === null && height === null) return "—";
  return `${measurement(width)} x ${measurement(height)} mm`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;

  if (normalized.length === 11) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
  }

  if (normalized.length === 10) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  }

  return value;
}

function dimensionPriceLabel(label: string, index: number): string {
  const normalizedLabel = label.trim();
  return normalizedLabel || `AMBIENTE ${index + 1}`;
}

async function prepareItemImages(items: ParsedQuoteInput["items"]): Promise<Array<PdfImageSource | null>> {
  const results = new Array<PdfImageSource | null>(items.length).fill(null);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fetchOptimizedPdfImage(items[index].imageUrl);
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, items.length) }, () => worker()));
  return results;
}

interface QuotePdfDocumentProps {
  quote: ParsedQuoteInput;
  logo: PdfImageSource;
  itemImages: Array<PdfImageSource | null>;
}

function QuotePdfDocument({ quote, logo, itemImages }: QuotePdfDocumentProps) {
  return (
    <Document
      title={`Orçamento ${quote.quoteNumber}`}
      author={companyData.name}
      subject={`Orçamento para ${quote.client.name}`}
      language="pt-BR"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.company}>
            <Text style={styles.companyName}>{companyData.name.toUpperCase()}</Text>
            <Text style={styles.systemName}>TKZ SISTEMAS</Text>
            <Text style={styles.companyLine}>ENDEREÇO: {companyData.address}</Text>
            <Text style={styles.companyLine}>CNPJ: {companyData.cnpj}</Text>
            <Text style={styles.companyLine}>EMAIL: {companyData.email}  CEL: {companyData.cel}</Text>
          </View>
          <View style={styles.quoteIdentity}>
            <PdfImage src={logo} style={styles.logo} />
            <Text style={styles.quoteTitle}>ORÇAMENTO Nº {quote.quoteNumber}</Text>
            <Text style={styles.quoteDate}>DATA: {formatDate(quote.date)}</Text>
          </View>
        </View>

        <View style={styles.clientBox}>
          <Text style={styles.clientLabel}>CLIENTE</Text>
          <Text style={styles.clientName}>{quote.client.name}</Text>
          {quote.client.address ? <Text style={styles.clientLine}>ENDEREÇO: {quote.client.address}</Text> : null}
          {quote.client.phone ? <Text style={styles.clientLine}>CELULAR: {formatPhone(quote.client.phone)}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>PRODUTOS</Text>
        {quote.items.map((item, index) => (
          <View key={`${index}-${item.title}`} style={styles.item}>
            <View style={styles.itemLayout} minPresenceAhead={55}>
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>ITEM {index + 1} - {item.title}</Text>
                <View style={styles.itemBody}>
                  {itemImages[index] ? <PdfImage src={itemImages[index]!} style={styles.itemImage} /> : null}
                  <View style={styles.itemDetails}>
                    {item.dimensions.length > 0 ? (
                      item.dimensions.map((dimension, dimensionIndex) => (
                        <View key={`${dimensionIndex}-${dimension.label}`} style={styles.dimensionRow}>
                          <Text style={styles.dimensionLabel}>
                            • {dimensionMeasurement(dimension.width, dimension.height)}
                            {dimension.label ? ` — ${dimension.label}` : ""}
                            {dimension.quantity > 1 ? ` (×${dimension.quantity})` : ""}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <>
                        <Text style={styles.detailLine}>
                          LARGURA: {measurementWithUnit(item.width)}  ALTURA: {measurementWithUnit(item.height)}
                        </Text>
                        {item.glass ? <Text style={styles.detailLine}>COR DO VIDRO: {item.glass}</Text> : null}
                        {item.aluminumColor ? <Text style={styles.detailLine}>COR DOS ALUMÍNIOS: {item.aluminumColor}</Text> : null}
                        {item.hardwareColor ? <Text style={styles.detailLine}>COR DAS FERRAGENS: {item.hardwareColor}</Text> : null}
                        <Text style={styles.detailLine}>QUANTIDADE: {item.quantity}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.itemPrices}>
                {item.dimensions.length > 0 ? (
                  item.dimensions.map((dimension, dimensionIndex) => (
                    <Text key={`${dimensionIndex}-${dimension.label}-price`} style={styles.priceLine}>
                      {dimensionPriceLabel(dimension.label, dimensionIndex)}: {money(dimension.totalPrice)}
                    </Text>
                  ))
                ) : item.unitPrice !== null && item.unitPrice > 0 ? (
                  <Text style={styles.priceLine}>VALOR UNITÁRIO: {money(item.unitPrice)}</Text>
                ) : null}
                <Text style={styles.itemTotal}>VALOR TOTAL: {money(item.totalPrice)}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.summary} wrap={false}>
          <View style={styles.summaryRow}>
            <View style={styles.conditions}>
              {quote.deliveryDate ? (
                <Text style={styles.condition}>
                  <Text style={styles.conditionLabel}>PREVISÃO DE ENTREGA:</Text> {formatDate(quote.deliveryDate)}
                </Text>
              ) : null}
              {quote.validUntil ? (
                <Text style={styles.condition}>
                  <Text style={styles.conditionLabel}>ORÇAMENTO VÁLIDO ATÉ:</Text> {formatDate(quote.validUntil)}
                </Text>
              ) : null}
              {quote.paymentConditions ? (
                <Text style={styles.condition}>
                  <Text style={styles.conditionLabel}>CONDIÇÕES DE PAGAMENTO:</Text> {quote.paymentConditions}
                </Text>
              ) : null}
            </View>
            <View style={styles.totals}>
              {quote.discount > 0 ? <Text style={styles.discount}>DESCONTO: - {money(quote.discount)}</Text> : null}
              <Text style={styles.grandTotal}>TOTAL: {money(quote.total)}</Text>
            </View>
          </View>
          {quote.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesTitle}>OBSERVAÇÕES:</Text>
              <Text>{quote.notes}</Text>
            </View>
          ) : null}
          <View style={styles.signatures}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureName}>{quote.client.name}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureName}>{companyData.name}</Text>
            </View>
          </View>
        </View>

        <Text
          fixed
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Orçamento ${quote.quoteNumber} • Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(quote: ParsedQuoteInput): Promise<Uint8Array> {
  const [logoData, itemImages] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "se7e-logo-v2.png")),
    prepareItemImages(quote.items),
  ]);
  const logo: PdfImageSource = { data: logoData, format: "png" };
  const buffer = await renderToBuffer(
    <QuotePdfDocument quote={quote} logo={logo} itemImages={itemImages} />,
  );
  return new Uint8Array(buffer);
}
