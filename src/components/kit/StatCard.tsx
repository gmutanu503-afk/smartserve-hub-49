import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  change?: number;
  changeLabel?: string;
  hint?: string;
  tone?: "default" | "gold" | "navy";
  loading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeLabel = "vs last period",
  hint,
  tone = "default",
  loading,
  className,
}: StatCardProps) {
  const positive = (change ?? 0) >= 0;
  return (
    <div
      className={cn(
        "surface-card relative overflow-hidden p-5 transition-shadow hover:shadow-elevated",
        tone === "navy" && "gradient-navy border-transparent text-navy-foreground",
        className,
      )}
    >
      {tone === "gold" && <span className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden />}
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            tone === "navy" ? "text-sidebar-muted" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              tone === "navy" ? "bg-sidebar-accent text-gold" : "bg-secondary text-foreground",
              tone === "gold" && "bg-gold-soft text-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-3 font-display text-2xl font-bold tracking-tight md:text-[28px]">{value}</p>
      )}
      {(change !== undefined || hint) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {change !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
                positive ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
              )}
            >
              {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          <span className={tone === "navy" ? "text-sidebar-muted" : "text-muted-foreground"}>
            {hint ?? changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
