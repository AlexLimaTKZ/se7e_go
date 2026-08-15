import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, quoteItemDimensions, quoteItems, quotes } from "@/lib/db/schema";
import { parseQuoteInput } from "@/lib/quotes/quote-input";
import {
  insertQuoteItems,
  resolveQuoteNumber,
  upsertClient,
} from "@/lib/quotes/quote-repository";

export const dynamic = "force-dynamic";

function parseId(id: string): number | null {
  const value = Number.parseInt(id, 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const quoteId = parseId((await params).id);
    if (!quoteId) return NextResponse.json({ error: "ID invalido." }, { status: 400 });

    const database = getDb();
    const [quote] = await database
      .select({ quote: quotes, client: clients })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.id, quoteId))
      .limit(1);
    if (!quote) {
      return NextResponse.json({ error: "Orcamento nao encontrado." }, { status: 404 });
    }

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
    const formattedItems = items.map((item) => ({
      id: item.id,
      image_url: item.imageUrl,
      title: item.title,
      width: item.width,
      height: item.height,
      glass: item.glass,
      aluminum: item.aluminumColor,
      hardware: item.hardwareColor,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      dimensions: (dimensionsByItem.get(item.id) || []).map((dimension) => ({
        id: dimension.id,
        label: dimension.label,
        width: dimension.width,
        height: dimension.height,
        quantity: dimension.quantity,
        unit_price: dimension.unitPrice,
        total_price: dimension.totalPrice,
      })),
    }));

    return NextResponse.json({
      ...quote.quote,
      status: quote.quote.status || "rascunho",
      payment_conditions: quote.quote.paymentConditions || "",
      discount: quote.quote.discount || 0,
      notes: quote.quote.notes || "",
      client: quote.client,
      items: formattedItems,
    });
  } catch (error) {
    console.error("Erro ao buscar orcamento:", error);
    return NextResponse.json({ error: "Erro ao buscar orcamento." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const quoteId = parseId((await params).id);
    if (!quoteId) return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    const parsed = parseQuoteInput(await request.json());
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Revise os dados do orcamento.", issues: parsed.issues },
        { status: 422 },
      );
    }

    const result = await getDb().transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ id: quotes.id })
        .from(quotes)
        .where(eq(quotes.id, quoteId))
        .limit(1);
      if (!existing) return null;

      const data = parsed.data;
      const clientId = await upsertClient(transaction, data.client);
      const quoteNumber = await resolveQuoteNumber(transaction, data.quoteNumber, quoteId);
      await transaction
        .update(quotes)
        .set({
          quoteNumber,
          clientId,
          date: data.date,
          deliveryDate: data.deliveryDate,
          validUntil: data.validUntil,
          total: data.total,
          status: data.status,
          paymentConditions: data.paymentConditions || null,
          discount: data.discount,
          notes: data.notes || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(quotes.id, quoteId));
      await transaction.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
      await insertQuoteItems(transaction, quoteId, data.items);
      return { quoteNumber };
    });

    if (!result) {
      return NextResponse.json({ error: "Orcamento nao encontrado." }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      ...result,
      message: "Orcamento atualizado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao atualizar orcamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar o orcamento." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const quoteId = parseId((await params).id);
    if (!quoteId) return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    const deleted = await getDb()
      .delete(quotes)
      .where(eq(quotes.id, quoteId))
      .returning({ id: quotes.id });
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Orcamento nao encontrado." }, { status: 404 });
    }
    return NextResponse.json({ message: "Orcamento excluido com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar orcamento:", error);
    return NextResponse.json({ error: "Erro ao deletar orcamento." }, { status: 500 });
  }
}
