import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, quotes, quoteItems, quoteItemDimensions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/quotes — Listar todos os orçamentos
export async function GET() {
  try {
    const result = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        clientName: clients.name,
        clientPhone: clients.phone,
        date: quotes.date,
        total: quotes.total,
        status: quotes.status,
      })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .orderBy(desc(quotes.id));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao listar orçamentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar orçamentos." },
      { status: 500 }
    );
  }
}

// POST /api/quotes — Criar novo orçamento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Inserir ou atualizar cliente
    const existingClient = await db
      .select()
      .from(clients)
      .where(eq(clients.name, body.client.name))
      .limit(1);

    let clientId: number;

    if (existingClient.length > 0) {
      // Atualizar dados do cliente existente
      await db
        .update(clients)
        .set({
          address: body.client.address,
          phone: body.client.phone,
        })
        .where(eq(clients.name, body.client.name));
      clientId = existingClient[0].id;
    } else {
      // Inserir novo cliente
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

    // Inserir o orçamento
    const now = new Date().toISOString();
    const [newQuote] = await db
      .insert(quotes)
      .values({
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
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: quotes.id });

    // Inserir os itens (um a um para obter IDs e vincular dimensões)
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        const [newItem] = await db
          .insert(quoteItems)
          .values({
            quoteId: newQuote.id,
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

    return NextResponse.json({
      success: true,
      id: newQuote.id,
      message: "Orçamento criado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    return NextResponse.json(
      { error: "Erro ao processar o orçamento." },
      { status: 500 }
    );
  }
}
