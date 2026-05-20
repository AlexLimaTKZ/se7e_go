import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, quotes, quoteItems, quoteItemDimensions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/quotes/[id] — Buscar orçamento por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quoteId = parseInt(id);

    const quote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (quote.length === 0) {
      return NextResponse.json(
        { error: "Orçamento não encontrado." },
        { status: 404 }
      );
    }

    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, quote[0].clientId!))
      .limit(1);

    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId));

    // Buscar dimensões de cada item
    const formattedItems = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items.map(async (item: any) => {
        const dims = await db
          .select()
          .from(quoteItemDimensions)
          .where(eq(quoteItemDimensions.quoteItemId, item.id));

        return {
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
          dimensions: dims.map((d: typeof quoteItemDimensions.$inferSelect) => ({
            id: d.id,
            label: d.label,
            width: d.width,
            height: d.height,
            quantity: d.quantity,
            unit_price: d.unitPrice,
            total_price: d.totalPrice,
          })),
        };
      })
    );

    return NextResponse.json({
      ...quote[0],
      status: quote[0].status || "rascunho",
      payment_conditions: quote[0].paymentConditions || "",
      discount: quote[0].discount || 0,
      notes: quote[0].notes || "",
      client: client[0] || null,
      items: formattedItems,
    });
  } catch (error) {
    console.error("Erro ao buscar orçamento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar orçamento." },
      { status: 500 }
    );
  }
}

// PUT /api/quotes/[id] — Atualizar orçamento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quoteId = parseInt(id);
    const body = await request.json();

    // Inserir ou atualizar cliente
    const existingClient = await db
      .select()
      .from(clients)
      .where(eq(clients.name, body.client.name))
      .limit(1);

    let clientId: number;

    if (existingClient.length > 0) {
      await db
        .update(clients)
        .set({
          address: body.client.address,
          phone: body.client.phone,
        })
        .where(eq(clients.name, body.client.name));
      clientId = existingClient[0].id;
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({
          name: body.client.name,
          address: body.client.address,
          phone: body.client.phone,
        })
        .returning({ id: clients.id });
      clientId = newClient.id;
    }

    // Atualizar o orçamento
    await db
      .update(quotes)
      .set({
        quoteNumber: body.quote_number,
        clientId,
        date: body.date,
        deliveryDate: body.delivery_date || null,
        validUntil: body.valid_until || null,
        total: parseFloat(body.total),
        status: body.status || "rascunho",
        paymentConditions: body.payment_conditions || null,
        discount: body.discount ? parseFloat(body.discount) : null,
        notes: body.notes || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, quoteId));

    // Deletar itens antigos (CASCADE remove dimensões automaticamente)
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));

    // Inserir novos itens (um a um para obter IDs e vincular dimensões)
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        const [newItem] = await db
          .insert(quoteItems)
          .values({
            quoteId,
            title: item.title,
            imageUrl: item.image_url || null,
            width: item.width ? parseFloat(item.width) : null,
            height: item.height ? parseFloat(item.height) : null,
            glass: item.glass || null,
            aluminumColor: item.aluminum || null,
            hardwareColor: item.hardware || null,
            quantity: item.quantity ? parseInt(item.quantity) : 1,
            unitPrice: item.unit_price ? parseFloat(item.unit_price) : null,
            totalPrice: item.total_price ? parseFloat(item.total_price) : 0,
          })
          .returning({ id: quoteItems.id });

        // Inserir dimensões do item (se existirem)
        if (item.dimensions && item.dimensions.length > 0) {
          const dimsToInsert = item.dimensions.map(
            (dim: {
              label?: string;
              width?: string;
              height?: string;
              quantity?: string;
              unit_price?: string;
              total_price?: string;
            }) => ({
              quoteItemId: newItem.id,
              label: dim.label || null,
              width: dim.width ? parseFloat(dim.width) : null,
              height: dim.height ? parseFloat(dim.height) : null,
              quantity: dim.quantity ? parseInt(dim.quantity) : 1,
              unitPrice: dim.unit_price ? parseFloat(dim.unit_price) : null,
              totalPrice: dim.total_price ? parseFloat(dim.total_price) : 0,
            })
          );
          await db.insert(quoteItemDimensions).values(dimsToInsert);
        }
      }
    }

    return NextResponse.json({ message: "Orçamento atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar o orçamento." },
      { status: 500 }
    );
  }
}

// DELETE /api/quotes/[id] — Excluir orçamento
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quoteId = parseInt(id);

    // Os itens são deletados automaticamente por CASCADE
    const result = await db
      .delete(quotes)
      .where(eq(quotes.id, quoteId))
      .returning({ id: quotes.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Orçamento não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Orçamento excluído com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar orçamento:", error);
    return NextResponse.json(
      { error: "Erro ao deletar orçamento." },
      { status: 500 }
    );
  }
}
