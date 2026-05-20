import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quotes, quoteItems, quoteItemDimensions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quoteId = parseInt(id);

    // Buscar orçamento original
    const originalQuote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (originalQuote.length === 0) {
      return NextResponse.json(
        { error: "Orçamento não encontrado." },
        { status: 404 }
      );
    }

    // Buscar itens originais
    const originalItems = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId));

    // Duplicar orçamento principal
    const now = new Date().toISOString();
    const [newQuote] = await db
      .insert(quotes)
      .values({
        quoteNumber: `${originalQuote[0].quoteNumber}-CÓPIA`,
        clientId: originalQuote[0].clientId,
        date: now.split("T")[0],
        deliveryDate: originalQuote[0].deliveryDate,
        validUntil: originalQuote[0].validUntil,
        total: originalQuote[0].total,
        status: "rascunho",
        paymentConditions: originalQuote[0].paymentConditions,
        discount: originalQuote[0].discount,
        notes: originalQuote[0].notes,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: quotes.id });

    // Duplicar itens (um a um para obter IDs e copiar dimensões)
    if (originalItems.length > 0) {
      for (const item of originalItems) {
        const [newItem] = await db
          .insert(quoteItems)
          .values({
            quoteId: newQuote.id,
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
          })
          .returning({ id: quoteItems.id });

        // Copiar dimensões do item original
        const originalDims = await db
          .select()
          .from(quoteItemDimensions)
          .where(eq(quoteItemDimensions.quoteItemId, item.id));

        if (originalDims.length > 0) {
          const dimsToInsert = originalDims.map((dim: typeof quoteItemDimensions.$inferSelect) => ({
            quoteItemId: newItem.id,
            label: dim.label,
            width: dim.width,
            height: dim.height,
            quantity: dim.quantity,
            unitPrice: dim.unitPrice,
            totalPrice: dim.totalPrice,
          }));
          await db.insert(quoteItemDimensions).values(dimsToInsert);
        }
      }
    }

    return NextResponse.json({
      success: true,
      id: newQuote.id,
      message: "Orçamento duplicado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao duplicar orçamento:", error);
    return NextResponse.json(
      { error: "Erro ao processar duplicação do orçamento." },
      { status: 500 }
    );
  }
}
