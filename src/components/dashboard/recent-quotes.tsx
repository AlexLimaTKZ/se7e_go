"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface RecentQuote {
  id: number;
  quoteNumber: string;
  clientName: string;
  total: number;
  date: string;
}

interface RecentQuotesProps {
  quotes: RecentQuote[];
}

export function RecentQuotes({ quotes }: RecentQuotesProps) {
  if (quotes.length === 0) {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <p className="text-sm">Nenhum orçamento aprovado recentemente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map((quote, index) => (
        <motion.div
          key={quote.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: index * 0.035 }}
        >
          <Link
            href={`/novo?id=${quote.id}`}
            className="group flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/50 p-3 outline-none transition-colors hover:bg-accent/10 focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`Abrir orçamento ${quote.quoteNumber} de ${quote.clientName}`}
          >
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">{quote.clientName}</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="h-5 px-1.5 font-mono text-[11px]">#{quote.quoteNumber}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(quote.date)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-bold text-primary">{formatCurrency(quote.total)}</span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
