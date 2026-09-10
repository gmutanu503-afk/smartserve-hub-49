import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, DollarSign, TrendingUp, UserMinus } from "lucide-react";
import { DonutChart, SimpleBarChart, TrendAreaChart, TrendLineChart } from "@/components/charts";
import { PageHeader, SectionCard } from "@/components/kit/PageHeader";
import { StatCard } from "@/components/kit/StatCard";
import { formatCompact, formatMoney } from "@/lib/format";
import { clientGrowth, clientsByPlan, clientsByStatus, featureUsage, platformKpis, revenueTrend } from "@/lib/mock/platform-analytics";
import { latestSubscription, organizationsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Platform analytics — SmartServe" },
      { name: "description", content: "Revenue, growth, churn and feature adoption across all SmartServe clients." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: orgs } = useQuery(organizationsQuery);
  const live = (orgs ?? []).map((o) => ({ org: o, sub: latestSubscription(o.subscriptions) }));
  const liveMrr = live.reduce((s, r) => (r.sub && ["ACTIVE", "TRIAL", "PAYMENT_DUE"].includes(r.sub.status) ? s + Number(r.sub.price) : s), 0);

  const statusData = live.length
    ? [
        { name: "Active", value: live.filter((r) => r.org.status === "active").length },
        { name: "Trial", value: live.filter((r) => r.org.status === "trial").length },
        { name: "Suspended", value: live.filter((r) => r.org.status === "suspended").length },
        { name: "Cancelled", value: live.filter((r) => r.org.status === "cancelled").length },
      ].filter((d) => d.value > 0)
    : clientsByStatus;

  return (
    <>
      <PageHeader eyebrow="Insights" title="Platform analytics" description="How SmartServe is growing across revenue, clients and feature adoption." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={formatMoney(liveMrr || platformKpis.mrr)} icon={DollarSign} change={platformKpis.mrrChange} tone="navy" />
        <StatCard label="Total clients" value={live.length || platformKpis.totalClients} icon={Building2} change={platformKpis.clientsChange} tone="gold" />
        <StatCard label="New this month" value={platformKpis.newClientsThisMonth} icon={TrendingUp} hint="Signed up in the last 30 days" />
        <StatCard label="Churn (12 mo)" value={`${clientGrowth.reduce((s, m) => s + m.cancelled, 0)}`} icon={UserMinus} hint="Cancelled accounts" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="Revenue growth" description="MRR and collected revenue" className="lg:col-span-2">
          <TrendAreaChart
            data={revenueTrend}
            xKey="month"
            series={[{ key: "mrr", name: "MRR" }, { key: "revenue", name: "Revenue", color: "var(--chart-2)" }]}
            formatter={(v) => `$${formatCompact(v)}`}
            height={300}
          />
        </SectionCard>
        <SectionCard title="Clients by status">
          <DonutChart data={statusData} centerValue={String(statusData.reduce((s, d) => s + d.value, 0))} centerLabel="clients" height={300} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="New vs cancelled clients" description="Monthly acquisition and churn">
          <SimpleBarChart
            data={clientGrowth}
            xKey="month"
            series={[{ key: "newClients", name: "New" }, { key: "cancelled", name: "Cancelled", color: "var(--chart-4)" }]}
          />
        </SectionCard>
        <SectionCard title="Total client base" description="Cumulative clients per month">
          <TrendLineChart data={clientGrowth} xKey="month" series={[{ key: "clients", name: "Clients" }]} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Feature adoption" description="Clients with each feature enabled">
          <SimpleBarChart data={featureUsage} xKey="name" series={[{ key: "value", name: "Clients" }]} layout="vertical" height={300} />
        </SectionCard>
        <SectionCard title="Plan distribution">
          <DonutChart data={clientsByPlan} centerValue={String(clientsByPlan.reduce((s, p) => s + p.value, 0))} centerLabel="clients" height={300} />
        </SectionCard>
      </div>
    </>
  );
}
