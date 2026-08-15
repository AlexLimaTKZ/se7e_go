import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, quoteItemDimensions, quoteItems, quotes } from "@/lib/db/schema";
import { parseQuoteInput, type ParsedQuoteInput } from "@/lib/quotes/quote-input";

export async function loadSavedQuoteInput(quoteId: number): Promise<ParsedQuoteInput | null> {
  if (!Number.isInteger(quoteId) || quoteId <= 0) return null;

  const database = getDb();
  const [row] = await database
    .select({ quote: quotes, client: clients })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!row) return null;

  const items = await database.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  const dimensions =
    items.length > 0
      ? await database
          .select()
          .from(quoteItemDimensions)
          .where(inArray(quoteItemDimensions.quoteItemId, items.map((item) => item.id)))
      : [];

  const dimensionsByItem = new Map<number, typeof dimensions>();
  for (const dimension of dimensions) {
    const itemDimensions = dimensionsByItem.get(dimension.quoteItemId) || [];
    itemDimensions.push(dimension);
    dimensionsByItem.set(dimension.quoteItemId, itemDimensions);
  }

  const parsed = parseQuoteInput({
    client: {
      name: row.client?.name || "",
      address: row.client?.address || "",
      phone: row.client?.phone || "",
    },
    quoteNumber: row.quote.quoteNumber,
    date: row.quote.date,
    deliveryDate: row.quote.deliveryDate,
    validUntil: row.quote.validUntil,
    status: row.quote.status,
    paymentConditions: row.quote.paymentConditions || "",
    discount: row.quote.discount || 0,
    notes: row.quote.notes || "",
    items: items.map((item) => ({
      title: item.title,
      imageUrl: item.imageUrl || "",
      width: item.width,
      height: item.height,
      glass: item.glass || "",
      aluminumColor: item.aluminumColor || "",
      hardwareColor: item.hardwareColor || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      dimensions: (dimensionsByItem.get(item.id) || []).map((dimension) => ({
        label: dimension.label || "",
        width: dimension.width,
        height: dimension.height,
        quantity: dimension.quantity,
        unitPrice: dimension.unitPrice,
        totalPrice: dimension.totalPrice,
      })),
    })),
  });

  if (!parsed.ok) {
    throw new Error(`Orcamento salvo invalido: ${parsed.issues.join(" ")}`);
  }

  return parsed.data;
}
