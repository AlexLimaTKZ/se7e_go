"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleCheckBig,
  FileText,
  Plus,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { BentoGrid, DashboardCard } from "@/components/dashboard/dashboard-cards";
import { QuickNotes } from "@/components/dashboard/quick-notes";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentQuotes } from "@/components/dashboard/recent-quotes";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildQuoteStatusHref,
  describeRevenueComparison,
  type DashboardData,
  type QuoteStatus,
} from "@/lib/dashboard/dashboard-presentation";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type StatusCard = {
  status: QuoteStatus;
  label: string;
  metric: "draftCount" | "sentCount" | "approvedCount" | "rejectedCount" | "completedCount";
  icon: LucideIcon;
  iconClassName: string;
  badgeClassName: string;
};

const statusCards: StatusCard[] = [
  {
    status: "rascunho",
    label: "Rascunhos",
    metric: "draftCount",
    icon: FileText,
    iconClassName: "border-slate-200/60 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-black/30 dark:text-slate-300",
    badgeClassName: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100",
  },
  {
    status: "enviado",
    label: "Enviados",
    metric: "sentCount",
    icon: Send,
    iconClassName: "border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/15 dark:bg-blue-500/10 dark:text-blue-300",
    badgeClassName: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  },
  {
    status: "aprovado",
    label: "Aprovados",
    metric: "approvedCount",
    icon: ThumbsUp,
    iconClassName: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-300",
    badgeClassName: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  {
    status: "recusado",
    label: "Recusados",
    metric: "rejectedCount",
    icon: ThumbsDown,
    iconClassName: "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-500/15 dark:bg-rose-500/10 dark:text-rose-300",
    badgeClassName: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  },
  {
    status: "concluido",
    label: "Concluídos",
    metric: "completedCount",
    icon: CircleCheckBig,
    iconClassName: "border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-500/15 dark:bg-indigo-500/10 dark:text-indigo-300",
    badgeClassName: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200",
  },
];

function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300" role="status" aria-label="Carregando dashboard">
      <span className="sr-only">Carregando dashboard</span>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2"><Skeleton className="h-9 w-52" /><Skeleton className="h-5 w-72 max-w-full" /></div>
        <Skeleton className="h-12 w-full sm:w-44" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-[390px] md:col-span-2" />
        <Skeleton className="h-[390px]" />
        <Skeleton className="h-[330px] md:col-span-2" />
        <Skeleton className="h-[330px]" />
      </div>
    </div>
  );
}

function DashboardError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
      <div className="w-full rounded-2xl border border-destructive/25 bg-destructive/5 p-6 text-center" role="alert">
        <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">Não foi possível carregar o dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Verifique sua conexão e tente novamente. Nenhum valor estimado foi exibido.</p>
        <Button className="mt-5 h-11" variant="outline" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={cn("size-4", retrying && "animate-spin")} />
          {retrying ? "Tentando novamente" : "Tentar novamente"}
        </Button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store", signal });
      if (!response.ok) throw new Error("dashboard request failed");
      setData((await response.json()) as DashboardData);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError("Não foi possível atualizar os dados do dashboard.");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  if (loading) return <DashboardLoading />;
  if (!data) return <DashboardError retrying={refreshing} onRetry={() => void loadDashboard()} />;

  const comparison = describeRevenueComparison(data.metrics.monthlyRevenue, data.metrics.lastMonthRevenue);

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6" aria-busy={refreshing}>
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão geral</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhe seus orçamentos e as próximas ações em um só lugar.</p>
          </div>
          <Link
            href="/novo"
            className={cn(buttonVariants({ size: "lg" }), "h-12 w-full gap-2 bg-gradient-to-r from-primary via-[#215E9A] to-[#458BCE] px-6 text-white shadow-sm hover:shadow-[0_0_18px_rgba(33,94,154,0.28)] sm:w-auto")}
          >
            <Plus className="size-5" aria-hidden="true" />
            <span className="font-semibold">Novo orçamento</span>
          </Link>
        </motion.header>

        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <div className="flex gap-3"><AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" /><p className="text-sm">{error} Os dados anteriores foram preservados.</p></div>
            <Button variant="outline" className="h-11" onClick={() => void loadDashboard()} disabled={refreshing}>
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} /> Tentar novamente
            </Button>
          </div>
        )}

        <BentoGrid>
          <DashboardCard title="Faturamento do mês" className="md:col-span-2" icon={<TrendingUp className="size-4" />} delay={0.04}>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="break-words text-[clamp(2rem,7vw,3rem)] font-black leading-none tracking-tight text-foreground dark:text-primary">
                    {formatCurrency(data.metrics.monthlyRevenue)}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aprovados</span>
                </div>
                <p className={cn(
                  "w-fit rounded-full border px-2.5 py-1 text-xs font-medium",
                  comparison.kind === "positive" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  comparison.kind === "negative" && "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
                  comparison.kind === "neutral" && "border-border bg-muted/40 text-muted-foreground",
                )}>
                  {comparison.label}
                </p>
              </div>
              <RevenueChart data={data.chartData} />
            </div>
          </DashboardCard>

          <DashboardCard title="Status dos orçamentos" icon={<BarChart3 className="size-4" />} delay={0.07}>
            <div className="flex h-full flex-col justify-between py-1">
              <div className="space-y-1.5">
                {statusCards.map((item) => {
                  const Icon = item.icon;
                  const count = data.metrics[item.metric];
                  return (
                    <Link
                      key={item.status}
                      href={buildQuoteStatusHref(item.status)}
                      className="group flex min-h-12 touch-manipulation items-center justify-between rounded-xl border border-transparent p-2 outline-none transition-colors hover:border-border/60 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-label={`${item.label}: ${count}. Abrir orçamentos filtrados`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", item.iconClassName)}><Icon className="size-4" aria-hidden="true" /></span>
                        <span className="truncate text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">{item.label}</span>
                      </span>
                      <span className={cn("flex min-h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black", item.badgeClassName)}>{count}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                <p className="text-xs text-muted-foreground">Total: <span className="font-bold text-foreground">{data.metrics.totalCount}</span></p>
                <Link href="/orcamentos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-11 px-3 text-xs")}>Ver todos <ArrowUpRight className="size-3.5" /></Link>
              </div>
            </div>
          </DashboardCard>

          <div className="md:col-span-2">
            <DashboardCard title="Sucessos recentes" icon={<CheckCircle2 className="size-4" />} delay={0.08}>
              <RecentQuotes quotes={data.recentApproved} />
              <div className="mt-5 flex justify-center">
                <Link href="/orcamentos" className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full max-w-xs border-primary/20 text-xs font-bold uppercase tracking-wider hover:bg-primary/5")}>Ver todos os orçamentos</Link>
              </div>
            </DashboardCard>
          </div>

          <div><QuickNotes /></div>
        </BentoGrid>
      </div>
    </MotionConfig>
  );
}
