import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { quotes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [result] = await getDb()
      .select({ value: sql<number>`coalesce(max(cast(${quotes.quoteNumber} as integer)), 0)` })
      .from(quotes);
    return NextResponse.json({ nextNumber: String(Number(result?.value ?? 0) + 1) });
  } catch (error) {
    console.error("Erro ao buscar proximo numero:", error);
    return NextResponse.json({ nextNumber: "1" });
  }
}
