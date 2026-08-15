"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface ChartData {
  name: string;
  value: number;
}

interface RevenueChartProps {
  data: ChartData[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, data.length - 1));
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, data.length - 1));

  const hasRevenue = data.some((item) => item.value > 0);
  if (!hasRevenue) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center">
        <BarChart3 className="size-8 text-muted-foreground/50" aria-hidden="true" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Ainda não há faturamento aprovado neste período.
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const activeItem = data[safeActiveIndex] ?? data[data.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex min-h-11 items-end justify-between gap-3" aria-live="polite">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {activeItem.name}
          </p>
          <p className="text-lg font-bold text-primary">{formatCurrency(activeItem.value)}</p>
        </div>
        <p className="text-right text-xs text-muted-foreground">Toque ou use o teclado para explorar</p>
      </div>

      <div className="flex h-[180px] items-end justify-between gap-2" aria-label="Gráfico de faturamento aprovado por mês">
        {data.map((item, index) => {
          const scale = Math.max(item.value / maxValue, item.value > 0 ? 0.025 : 0);
          const isActive = index === safeActiveIndex;

          return (
            <button
              key={`${item.name}-${index}`}
              type="button"
              className="group flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`${item.name}: ${formatCurrency(item.value)}`}
              aria-pressed={isActive}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="relative w-full flex-1 overflow-hidden rounded-t-md bg-muted/25">
                <motion.span
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: scale, opacity: isActive ? 1 : 0.72 }}
                  transition={{ duration: 0.28, delay: index * 0.025, ease: "easeOut" }}
                  style={{ transformOrigin: "bottom" }}
                  className="absolute inset-0 rounded-t-md border-t border-primary/60 bg-gradient-to-t from-primary/20 via-primary/55 to-primary shadow-[0_0_16px_rgba(33,94,154,0.2)] motion-reduce:transition-none"
                />
              </span>
              <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      <table className="sr-only" aria-label="Faturamento aprovado por mês">
        <caption>Faturamento aprovado por mês</caption>
        <thead>
          <tr><th scope="col">Mês</th><th scope="col">Valor</th></tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={`${item.name}-table-${index}`}>
              <th scope="row">{item.name}</th>
              <td>{formatCurrency(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
