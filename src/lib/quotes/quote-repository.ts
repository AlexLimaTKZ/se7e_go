import { eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  quoteItemDimensions,
  quoteItems,
  quotes,
} from "@/lib/db/schema";
import type { ParsedQuoteInput, ParsedQuoteItem } from "./quote-input";

type QuoteDatabase = ReturnType<typeof getDb>;
export type QuoteTransaction = Parameters<Parameters<QuoteDatabase["transaction"]>[0]>[0];

export async function upsertClient(
  transaction: QuoteTransaction,
  client: ParsedQuoteInput["client"],
): Promise<number> {
  const [savedClient] = await transaction
    .insert(clients)
    .values(client)
    .onConflictDoUpdate({
      target: clients.name,
      set: { address: client.address, phone: client.phone },
    })
    .returning({ id: clients.id });

  if (!savedClient) throw new Error("Nao foi possivel salvar o cliente.");
  return savedClient.id;
}

export async function resolveQuoteNumber(
  transaction: QuoteTransaction,
  requested: string,
  excludeQuoteId?: number,
): Promise<string> {
  const condition = excludeQuoteId
    ? sql`${quotes.quoteNumber} = ${requested} AND ${ne(quotes.id, excludeQuoteId)}`
    : eq(quotes.quoteNumber, requested);
  const [conflict] = await transaction
    .select({ id: quotes.id })
    .from(quotes)
    .where(condition)
    .limit(1);
  if (!conflict) return requested;

  const [maximum] = await transaction
    .select({
      value: sql<number>`coalesce(max(cast(${quotes.quoteNumber} as integer)), 0)`,
    })
    .from(quotes);
  const nextNumber = Number(maximum?.value ?? 0) + 1;
  return String(nextNumber).padStart(Math.max(3, requested.length), "0");
}

export async function resolveCopyQuoteNumber(
  transaction: QuoteTransaction,
  original: string | null,
): Promise<string> {
  const base = `${original || "ORCAMENTO"}-COPIA`;
  for (let suffix = 1; suffix <= 1_000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const [conflict] = await transaction
      .select({ id: quotes.id })
      .from(quotes)
      .where(eq(quotes.quoteNumber, candidate))
      .limit(1);
    if (!conflict) return candidate;
  }
  throw new Error("Nao foi possivel gerar um numero para a copia.");
}

function itemValues(quoteId: number, item: ParsedQuoteItem) {
  return {
    quoteId,
    title: item.title,
    imageUrl: item.imageUrl || null,
    width: item.width,
    height: item.height,
    glass: item.glass || null,
    aluminumColor: item.aluminumColor || null,
    hardwareColor: item.hardwareColor || null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
  };
}

export async function insertQuoteItems(
  transaction: QuoteTransaction,
  quoteId: number,
  items: ParsedQuoteItem[],
): Promise<void> {
  const savedItems = await transaction
    .insert(quoteItems)
    .values(items.map((item) => itemValues(quoteId, item)))
    .returning({ id: quoteItems.id });
  if (savedItems.length !== items.length) {
    throw new Error("Nem todos os itens foram salvos.");
  }

  const dimensions = items.flatMap((item, itemIndex) =>
    item.dimensions.map((dimension) => ({
      quoteItemId: savedItems[itemIndex].id,
      label: dimension.label || null,
      width: dimension.width,
      height: dimension.height,
      quantity: dimension.quantity,
      unitPrice: dimension.unitPrice,
      totalPrice: dimension.totalPrice,
    })),
  );
  if (dimensions.length > 0) {
    await transaction.insert(quoteItemDimensions).values(dimensions);
  }
}
