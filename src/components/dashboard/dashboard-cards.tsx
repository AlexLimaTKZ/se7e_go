"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  delay?: number;
}

export function DashboardCard({
  title,
  children,
  className,
  icon,
  delay = 0,
}: DashboardCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(delay, 0.15) }}
      className={cn("h-full", className)}
    >
      <Card className="group relative h-full overflow-hidden border border-border/60 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-[0_14px_32px_rgba(0,0,0,0.07)] dark:bg-white/[0.04] dark:hover:bg-white/[0.05]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(33,94,154,0.1),transparent_48%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" />
        <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          {icon && <div className="text-primary/70" aria-hidden="true">{icon}</div>}
        </CardHeader>
        <CardContent className="relative z-10">{children}</CardContent>
      </Card>
    </motion.section>
  );
}

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[1fr]", className)}>
      {children}
    </div>
  );
}
