import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, quotes } from "@/lib/db/schema";
import { parseQuoteInput } from "@/lib/quotes/quote-input";
import {
  insertQuoteItems,
  resolveQuoteNumber,
  upsertClient,
} from "@/lib/quotes/quote-repository";
import { normalizeQuoteStatus } from "@/lib/dashboard/dashboard-presentation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(5, Number.parseInt(request.nextUrl.searchParams.get("limit") || "10", 10) || 10),
    );
    const search = (request.nextUrl.searchParams.get("search") || "").trim().slice(0, 100);
    const searchFilter = search
      ? or(like(clients.name, `%${search}%`), like(quotes.quoteNumber, `%${search}%`))
      : undefined;
    const status = normalizeQuoteStatus(request.nextUrl.searchParams.get("status"));
    const statusFilter = status === "concluido"
      ? inArray(quotes.status, ["concluido", "concluído"])
      : status
        ? eq(quotes.status, status)
        : undefined;
    const filters = and(searchFilter, statusFilter);
    const database = getDb();

    const [items, [countResult]] = await Promise.all([
      database
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
        .where(filters)
        .orderBy(desc(quotes.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      database
        .select({ total: sql<number>`count(*)` })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .where(filters),
    ]);
    const total = Number(countResult?.total ?? 0);

    return NextResponse.json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("Erro ao listar orcamentos:", error);
    return NextResponse.json({ error: "Erro ao buscar orcamentos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = parseQuoteInput(await request.json());
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Revise os dados do orcamento.", issues: parsed.issues },
        { status: 422 },
      );
    }

    const result = await getDb().transaction(async (transaction) => {
      const data = parsed.data;
      const clientId = await upsertClient(transaction, data.client);
      const quoteNumber = await resolveQuoteNumber(transaction, data.quoteNumber);
      const now = new Date().toISOString();
      const [quote] = await transaction
        .insert(quotes)
        .values({
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
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: quotes.id });
      if (!quote) throw new Error("O orcamento nao foi criado.");
      await insertQuoteItems(transaction, quote.id, data.items);
      return { id: quote.id, quoteNumber };
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: "Orcamento criado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao criar orcamento:", error);
    return NextResponse.json({ error: "Erro ao processar o orcamento." }, { status: 500 });
  }
}
