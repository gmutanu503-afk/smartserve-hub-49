import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg bg-gold text-gold-foreground shadow-gold",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <path d="M4 15h16" strokeLinecap="round" />
        <path d="M6 15a6 6 0 0 1 12 0" strokeLinecap="round" />
        <path d="M12 7V5" strokeLinecap="round" />
        <path d="M5 19h14" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  dark = false,
  subtitle,
}: {
  className?: string;
  dark?: boolean;
  subtitle?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <div className="leading-tight">
        <div
          className={cn(
            "font-display text-lg font-bold tracking-tight",
            dark ? "text-navy-foreground" : "text-foreground",
          )}
        >
          Smart<span className="text-gold">Serve</span>
        </div>
        {subtitle && (
          <div className={cn("text-[11px] font-medium uppercase tracking-[0.18em]", dark ? "text-sidebar-muted" : "text-muted-foreground")}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
