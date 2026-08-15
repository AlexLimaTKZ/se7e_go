import { NextResponse } from "next/server";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, quotes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  try {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return { key: monthKey(date), name: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") };
    });
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentKey = monthKey(now);
    const previousKey = monthKey(previousMonth);
    const successfulStatuses = ["aprovado", "concluido", "concluído"];
    const database = getDb();

    const [metricRows, recentApproved, revenueRows] = await Promise.all([
      database
        .select({
          monthlyRevenue: sql<number>`coalesce(sum(case when ${quotes.status} in ('aprovado', 'concluido', 'concluído') and substr(${quotes.date}, 1, 7) = ${currentKey} then ${quotes.total} else 0 end), 0)`,
          lastMonthRevenue: sql<number>`coalesce(sum(case when ${quotes.status} in ('aprovado', 'concluido', 'concluído') and substr(${quotes.date}, 1, 7) = ${previousKey} then ${quotes.total} else 0 end), 0)`,
          pendingCount: sql<number>`sum(case when ${quotes.status} in ('rascunho', 'enviado') then 1 else 0 end)`,
          draftCount: sql<number>`sum(case when ${quotes.status} = 'rascunho' then 1 else 0 end)`,
          sentCount: sql<number>`sum(case when ${quotes.status} = 'enviado' then 1 else 0 end)`,
          approvedCount: sql<number>`sum(case when ${quotes.status} = 'aprovado' then 1 else 0 end)`,
          rejectedCount: sql<number>`sum(case when ${quotes.status} = 'recusado' then 1 else 0 end)`,
          completedCount: sql<number>`sum(case when ${quotes.status} in ('concluido', 'concluído') then 1 else 0 end)`,
          totalCount: sql<number>`count(*)`,
        })
        .from(quotes),
      database
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          clientName: clients.name,
          total: quotes.total,
          date: quotes.date,
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .where(inArray(quotes.status, successfulStatuses))
        .orderBy(desc(quotes.date), desc(quotes.id))
        .limit(3),
      database
        .select({
          month: sql<string>`substr(${quotes.date}, 1, 7)`,
          value: sql<number>`coalesce(sum(${quotes.total}), 0)`,
        })
        .from(quotes)
        .where(
          sql`${inArray(quotes.status, successfulStatuses)} and ${gte(quotes.date, `${months[0].key}-01`)}`,
        )
        .groupBy(sql`substr(${quotes.date}, 1, 7)`),
    ]);

    const metrics = metricRows[0];
    const monthlyRevenue = Number(metrics?.monthlyRevenue ?? 0);
    const lastMonthRevenue = Number(metrics?.lastMonthRevenue ?? 0);
    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;
    const revenueByMonth = new Map(
      revenueRows.map((row) => [row.month, Number(row.value ?? 0)]),
    );

    return NextResponse.json({
      metrics: {
        monthlyRevenue,
        lastMonthRevenue,
        revenueGrowth,
        pendingCount: Number(metrics?.pendingCount ?? 0),
        draftCount: Number(metrics?.draftCount ?? 0),
        sentCount: Number(metrics?.sentCount ?? 0),
        approvedCount: Number(metrics?.approvedCount ?? 0),
        rejectedCount: Number(metrics?.rejectedCount ?? 0),
        completedCount: Number(metrics?.completedCount ?? 0),
        totalCount: Number(metrics?.totalCount ?? 0),
      },
      recentApproved: recentApproved.map((quote) => ({
        ...quote,
        clientName: quote.clientName || "Cliente não identificado",
      })),
      chartData: months.map((month) => ({
        name: month.name.charAt(0).toUpperCase() + month.name.slice(1),
        value: revenueByMonth.get(month.key) || 0,
      })),
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar dados do dashboard" },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
