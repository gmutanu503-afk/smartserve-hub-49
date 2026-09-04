import { LogoMark } from "@/components/brand/Logo";

export function FullPageLoader({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background" role="status" aria-live="polite">
      <LogoMark className="animate-pulse" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
