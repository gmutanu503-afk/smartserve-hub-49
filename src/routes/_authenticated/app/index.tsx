import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Receipt, ShoppingBag, Store, TrendingUp, Wallet } from "lucide-react";
import { DonutChart, SimpleBarChart } from "@/components/charts";
import { FullPageLoader } from "@/components/kit/FullPageLoader";
import { PageHeader, SectionCard } from "@/components/kit/PageHeader";
import { StatCard } from "@/components/kit/StatCard";
import { SubscriptionStatusBadge } from "@/components/kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/use-auth";
import { daysUntil, formatCompact, formatDate, formatMoney } from "@/lib/format";
import { clientKpis, paymentSplit, revenueByDay, smartAlerts, topProducts, type AlertSeverity } from "@/lib/mock/client-analytics";
import { myBranchesQuery, mySubscriptionQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SmartServe" },
      { name: "description", content: "Today's revenue, orders and smart alerts for your venue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientDashboard,
});

const ALERT_STYLES: Record<AlertSeverity, { icon: typeof Info; className: string }> = {
  critical: { icon: AlertTriangle, className: "bg-danger-soft text-danger" },
  warning: { icon: AlertTriangle, className: "bg-warning-soft text-warning" },
  positive: { icon: CheckCircle2, className: "bg-success-soft text-success" },
  info: { icon: Info, className: "bg-secondary text-muted-foreground" },
};

function ClientDashboard() {
  const { data: user } = useCurrentUser();
  const orgId = user?.organization?.id ?? "";
  const { data: branches } = useQuery({ ...myBranchesQuery(orgId), enabled: Boolean(orgId) });
  const { data: sub } = useQuery({ ...mySubscriptionQuery(orgId), enabled: Boolean(orgId) });

  if (!user) return <FullPageLoader />;
  const currency = user.organization?.currency ?? "KES";
  const trialDays = daysUntil(sub?.trial_ends_at);

  return (
    <>
      <PageHeader
        eyebrow={user.organization?.business_type ?? "Workspace"}
        title={user.organization?.name ?? "Your venue"}
        description="Live performance across your branches today."
        actions={
          <Button variant="outline-gold" asChild>
            <Link to="/app/analytics">Full analytics <ArrowRight /></Link>
          </Button>
        }
      />

      {sub && (sub.status === "TRIAL" || sub.status === "PAYMENT_DUE" || sub.status === "GRACE_PERIOD") && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm">
          <SubscriptionStatusBadge status={sub.status} />
          <p className="flex-1">
            {sub.status === "TRIAL"
              ? `Your free trial ends ${formatDate(sub.trial_ends_at)}${trialDays !== null ? ` — ${trialDays} days left.` : "."}`
              : `Payment is outstanding. Renewal date ${formatDate(sub.renewal_at)}.`}
          </p>
          <Button size="sm" variant="gold" asChild><Link to="/app/subscription">View subscription</Link></Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue today" value={formatMoney(clientKpis.todayRevenue, currency)} icon={Wallet} change={clientKpis.todayRevenueChange} tone="navy" />
        <StatCard label="Orders" value={clientKpis.orders} icon={ShoppingBag} change={clientKpis.ordersChange} />
        <StatCard label="Average order" value={formatMoney(clientKpis.avgOrderValue, currency)} icon={Receipt} change={clientKpis.aovChange} />
        <StatCard label="Gross profit" value={formatMoney(clientKpis.grossProfit, currency)} icon={TrendingUp} hint={`${clientKpis.grossMargin}% margin`} tone="gold" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="Smart alerts" description="Automatic insights from today's activity" className="lg:col-span-2" bodyClassName="p-0">
          <ul className="divide-y">
            {smartAlerts.map((a) => {
              const style = ALERT_STYLES[a.severity];
              return (
                <li key={a.id} className="flex gap-3 px-5 py-4">
                  <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg", style.className)}>
                    <style.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <span className={cn("shrink-0 text-sm font-bold", a.severity === "positive" ? "text-success" : a.severity === "critical" ? "text-danger" : "text-warning")}>{a.metric}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{a.detail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Payment mix" description="Share of today's payments">
            <DonutChart data={paymentSplit} formatter={(v) => `${v}%`} height={220} />
          </SectionCard>
          <SectionCard title="Branches" bodyClassName="p-0">
            <ul className="divide-y">
              {(branches ?? []).slice(0, 4).map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Store className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.city ?? "—"}</span>
                </li>
              ))}
              {branches?.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted-foreground">No branches yet.</li>}
            </ul>
          </SectionCard>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Revenue this week" description="Daily revenue across all branches">
          <SimpleBarChart data={revenueByDay} xKey="day" series={[{ key: "revenue", name: "Revenue" }]} formatter={(v) => formatCompact(v)} />
        </SectionCard>
        <SectionCard title="Top sellers" description="Best performing items in the last 7 days" bodyClassName="p-0">
          <ul className="divide-y">
            {topProducts.map((p, i) => (
              <li key={p.name} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-secondary text-xs font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.units} sold</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(p.revenue, currency)}</p>
                  <p className={cn("text-xs font-medium", p.trend >= 0 ? "text-success" : "text-danger")}>{p.trend >= 0 ? "+" : ""}{p.trend}%</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
