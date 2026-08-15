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
    borderBottomColor: "#111111",
    paddingBottom: 10,
    marginBottom: 12,
  },
  company: { width: "68%" },
  companyName: { fontSize: 17, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  systemName: { fontSize: 7, color: "#555555", marginBottom: 7 },
  companyLine: { marginBottom: 2, color: "#444444" },
  quoteIdentity: { width: "30%", alignItems: "flex-end" },
  logo: { width: 58, height: 58, objectFit: "contain", marginBottom: 5 },
  quoteTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  quoteDate: { fontSize: 9, marginTop: 3 },
  clientBox: { borderWidth: 0.8, borderColor: "#222222", padding: 8, marginBottom: 13 },
  clientName: { fontFamily: "Helvetica-Bold", marginBottom: 3, textTransform: "uppercase" },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 9 },
  item: { borderBottomWidth: 0.6, borderBottomColor: "#cccccc", paddingBottom: 10, marginBottom: 12 },
  itemLayout: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  itemMain: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  itemTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 6, textTransform: "uppercase" },
  itemBody: { flexDirection: "row", gap: 10 },
  itemImage: { width: 72, height: 72, objectFit: "contain", borderWidth: 0.5, borderColor: "#dddddd" },
  itemDetails: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  detailLine: { marginBottom: 2 },
  dimensionRow: { marginBottom: 2 },
  dimensionLabel: { flexShrink: 1 },
  itemPrices: { width: 190, flexShrink: 0, alignItems: "flex-end" },
  priceLine: { width: "100%", marginBottom: 2, textAlign: "right" },
  itemTotal: { width: "100%", marginTop: 2, fontFamily: "Helvetica-Bold", textAlign: "right" },
  summary: { borderTopWidth: 1.5, borderTopColor: "#111111", paddingTop: 10, marginTop: 5 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 20 },
  conditions: { flexGrow: 1, flexShrink: 1 },
  condition: { marginBottom: 3 },
  totals: { minWidth: 170, alignItems: "flex-end" },
  discount: { color: "#b42318", marginBottom: 5 },
  grandTotal: { borderWidth: 1.5, borderColor: "#111111", paddingVertical: 8, paddingHorizontal: 10, fontSize: 12, fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 11, padding: 8, backgroundColor: "#f6f6f6", borderWidth: 0.5, borderColor: "#cccccc" },
  notesTitle: { fontFamily: "Helvetica-Bold", marginBottom: 3 },
  signatures: { flexDirection: "row", gap: 34, marginTop: 35 },
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
            <Text style={styles.quoteTitle}>ORÇAMENTO {quote.quoteNumber}</Text>
            <Text style={styles.quoteDate}>{formatDate(quote.date)}</Text>
          </View>
        </View>

        <View style={styles.clientBox}>
          <Text style={styles.clientName}>{quote.client.name}</Text>
          {quote.client.address ? <Text>ENDEREÇO: {quote.client.address}</Text> : null}
          {quote.client.phone ? <Text>CELULAR: {quote.client.phone}</Text> : null}
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
                            • {measurement(dimension.width)} x {measurement(dimension.height)}
                            {dimension.label ? ` — ${dimension.label}` : ""}
                            {dimension.quantity > 1 ? ` (×${dimension.quantity})` : ""}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <>
                        <Text style={styles.detailLine}>LARGURA: {measurement(item.width)}  ALTURA: {measurement(item.height)}</Text>
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
              {quote.deliveryDate ? <Text style={styles.condition}>PREVISÃO DE ENTREGA: {formatDate(quote.deliveryDate)}</Text> : null}
              {quote.validUntil ? <Text style={styles.condition}>ORÇAMENTO VÁLIDO ATÉ: {formatDate(quote.validUntil)}</Text> : null}
              {quote.paymentConditions ? <Text style={styles.condition}>CONDIÇÕES DE PAGAMENTO: {quote.paymentConditions}</Text> : null}
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
