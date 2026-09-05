import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Building2, CalendarClock, DollarSign, Sparkles } from "lucide-react";
import { DonutChart, TrendAreaChart } from "@/components/charts";
import { DataTable } from "@/components/kit/DataTable";
import { PageHeader, SectionCard } from "@/components/kit/PageHeader";
import { StatCard } from "@/components/kit/StatCard";
import { PlanBadge, SubscriptionStatusBadge } from "@/components/kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { daysUntil, formatCompact, formatDate, formatMoney, formatRelative } from "@/lib/format";
import { clientGrowth, clientsByPlan, platformKpis, revenueTrend } from "@/lib/mock/platform-analytics";
import { latestSubscription, organizationsQuery, type OrgListRow } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Control Center — SmartServe" },
      { name: "description", content: "Platform-wide overview of SmartServe clients, subscriptions and revenue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const { data: orgs, isLoading } = useQuery(organizationsQuery);
  const rows = (orgs ?? []).map((o) => ({ org: o, sub: latestSubscription(o.subscriptions) }));
  const active = rows.filter((r) => r.org.status === "active").length;
  const trial = rows.filter((r) => r.org.status === "trial").length;
  const suspended = rows.filter((r) => r.org.status === "suspended").length;
  const mrr = rows.reduce((s, r) => (r.sub && r.sub.status !== "SUSPENDED" && r.sub.status !== "CANCELLED" ? s + Number(r.sub.price) : s), 0);
  const expiring = rows
    .filter((r) => {
      const d = daysUntil(r.sub?.renewal_at);
      return d !== null && d <= 7 && r.sub?.status !== "CANCELLED";
    })
    .sort((a, b) => (daysUntil(a.sub?.renewal_at) ?? 0) - (daysUntil(b.sub?.renewal_at) ?? 0));

  return (
    <>
      <PageHeader
        eyebrow="Super Admin"
        title="Control Center"
        description="Everything happening across the SmartServe platform, at a glance."
        actions={
          <Button variant="gold" asChild>
            <Link to="/admin/clients">Manage clients <ArrowRight /></Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total clients" value={isLoading ? "…" : rows.length} icon={Building2} change={platformKpis.clientsChange} tone="navy" />
        <StatCard label="Monthly recurring revenue" value={formatMoney(mrr || platformKpis.mrr)} icon={DollarSign} change={platformKpis.mrrChange} tone="gold" />
        <StatCard label="Active / Trial" value={`${active} / ${trial}`} icon={Sparkles} hint={`${suspended} suspended`} />
        <StatCard label="Expiring in 7 days" value={expiring.length} icon={CalendarClock} hint="Renewals needing attention" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="Revenue trend" description="MRR vs collected revenue (last 12 months)" className="lg:col-span-2">
          <TrendAreaChart
            data={revenueTrend}
            xKey="month"
            series={[
              { key: "mrr", name: "MRR" },
              { key: "revenue", name: "Revenue", color: "var(--chart-2)" },
            ]}
            formatter={(v) => `$${formatCompact(v)}`}
          />
        </SectionCard>
        <SectionCard title="Clients by plan">
          <DonutChart data={clientsByPlan} centerValue={String(clientsByPlan.reduce((s, p) => s + p.value, 0))} centerLabel="clients" />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="Client growth" description="Total clients per month" className="lg:col-span-2">
          <TrendAreaChart data={clientGrowth} xKey="month" series={[{ key: "clients", name: "Clients" }]} height={220} />
        </SectionCard>
        <SectionCard title="Needs attention" description="Subscriptions expiring within 7 days" bodyClassName="p-0">
          {expiring.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No renewals due this week.</p>
          ) : (
            <ul className="divide-y">
              {expiring.slice(0, 6).map(({ org, sub }) => (
                <li key={org.id}>
                  <Link to="/admin/clients/$id" params={{ id: org.id }} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/60">
                    <AlertTriangle className="size-4 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">Renews {formatDate(sub?.renewal_at)}</p>
                    </div>
                    {sub && <SubscriptionStatusBadge status={sub.status} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold">Recent clients</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/clients">View all</Link>
          </Button>
        </div>
        <RecentClients rows={rows.slice(0, 6)} loading={isLoading} />
      </div>
    </>
  );
}

function RecentClients({ rows, loading }: { rows: { org: OrgListRow; sub: ReturnType<typeof latestSubscription<OrgListRow["subscriptions"][number]>> }[]; loading: boolean }) {
  return (
    <DataTable
      loading={loading}
      rows={rows}
      rowKey={(r) => r.org.id}
      empty="No clients yet — create your first client from the Clients page."
      columns={[
        { key: "name", header: "Client", cell: (r) => <div><p className="font-medium">{r.org.name}</p><p className="text-xs text-muted-foreground capitalize">{r.org.business_type}</p></div> },
        { key: "plan", header: "Plan", cell: (r) => (r.sub?.plans ? <PlanBadge code={r.sub.plans.code} name={r.sub.plans.name} /> : "—") },
        { key: "status", header: "Status", cell: (r) => (r.sub ? <SubscriptionStatusBadge status={r.sub.status} /> : "—") },
        { key: "renewal", header: "Renewal", cell: (r) => formatDate(r.sub?.renewal_at) },
        { key: "activity", header: "Last activity", cell: (r) => <span className="text-muted-foreground">{formatRelative(r.org.last_activity_at)}</span> },
        { key: "open", header: "", className: "text-right", cell: (r) => <Button variant="ghost" size="sm" asChild><Link to="/admin/clients/$id" params={{ id: r.org.id }}>Open</Link></Button> },
      ]}
    />
  );
}
