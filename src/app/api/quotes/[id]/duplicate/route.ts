import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { quoteItemDimensions, quoteItems, quotes } from "@/lib/db/schema";
import { resolveCopyQuoteNumber } from "@/lib/quotes/quote-repository";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const quoteId = Number.parseInt((await params).id, 10);
    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const newQuoteId = await getDb().transaction(async (transaction) => {
      const [original] = await transaction
        .select()
        .from(quotes)
        .where(eq(quotes.id, quoteId))
        .limit(1);
      if (!original) return null;

      const originalItems = await transaction
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quoteId));
      const originalDimensions =
        originalItems.length > 0
          ? await transaction
              .select()
              .from(quoteItemDimensions)
              .where(inArray(quoteItemDimensions.quoteItemId, originalItems.map((item) => item.id)))
          : [];
      const quoteNumber = await resolveCopyQuoteNumber(transaction, original.quoteNumber);
      const now = new Date().toISOString();
      const [copy] = await transaction
        .insert(quotes)
        .values({
          quoteNumber,
          clientId: original.clientId,
          date: now.slice(0, 10),
          deliveryDate: original.deliveryDate,
          validUntil: original.validUntil,
          total: original.total,
          status: "rascunho",
          paymentConditions: original.paymentConditions,
          discount: original.discount,
          notes: original.notes,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: quotes.id });
      if (!copy) throw new Error("A copia nao foi criada.");

      if (originalItems.length > 0) {
        const copiedItems = await transaction
          .insert(quoteItems)
          .values(
            originalItems.map((item) => ({
              quoteId: copy.id,
              title: item.title,
              imageUrl: item.imageUrl,
              width: item.width,
              height: item.height,
              glass: item.glass,
              aluminumColor: item.aluminumColor,
              hardwareColor: item.hardwareColor,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          )
          .returning({ id: quoteItems.id });
        const newIdByOldId = new Map(
          originalItems.map((item, index) => [item.id, copiedItems[index].id]),
        );
        if (originalDimensions.length > 0) {
          await transaction.insert(quoteItemDimensions).values(
            originalDimensions.map((dimension) => ({
              quoteItemId: newIdByOldId.get(dimension.quoteItemId)!,
              label: dimension.label,
              width: dimension.width,
              height: dimension.height,
              quantity: dimension.quantity,
              unitPrice: dimension.unitPrice,
              totalPrice: dimension.totalPrice,
            })),
          );
        }
      }
      return copy.id;
    });

    if (!newQuoteId) {
      return NextResponse.json({ error: "Orcamento nao encontrado." }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      id: newQuoteId,
      message: "Orcamento duplicado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao duplicar orcamento:", error);
    return NextResponse.json({ error: "Erro ao duplicar o orcamento." }, { status: 500 });
  }
}
