import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Receipt, ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { DonutChart, SimpleBarChart, TrendAreaChart } from "@/components/charts";
import { FullPageLoader } from "@/components/kit/FullPageLoader";
import { PageHeader, SectionCard } from "@/components/kit/PageHeader";
import { StatCard } from "@/components/kit/StatCard";
import { useCurrentUser } from "@/lib/auth/use-auth";
import { formatCompact, formatMoney } from "@/lib/format";
import { clientKpis, paymentSplit, revenueByDay, topProducts } from "@/lib/mock/client-analytics";
import { myBranchesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — SmartServe" },
      { name: "description", content: "Sales, payments and product performance across your branches." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientAnalytics,
});

function ClientAnalytics() {
  const { data: user } = useCurrentUser();
  const orgId = user?.organization?.id ?? "";
  const { data: branches } = useQuery({ ...myBranchesQuery(orgId), enabled: Boolean(orgId) });
  if (!user) return <FullPageLoader />;
  const currency = user.organization?.currency ?? "KES";

  const branchPerformance = (branches ?? []).map((b, i) => ({
    name: b.name,
    revenue: Math.round(clientKpis.todayRevenue * (0.55 + ((i * 7) % 9) / 10)),
    orders: Math.round(clientKpis.orders * (0.4 + ((i * 5) % 8) / 10)),
  }));

  return (
    <>
      <PageHeader eyebrow="Insights" title="Analytics" description="Performance across your venue. Live figures start flowing once orders are running." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Revenue today" value={formatMoney(clientKpis.todayRevenue, currency)} icon={Wallet} change={clientKpis.todayRevenueChange} tone="navy" />
        <StatCard label="Orders" value={clientKpis.orders} icon={ShoppingBag} change={clientKpis.ordersChange} />
        <StatCard label="Average order" value={formatMoney(clientKpis.avgOrderValue, currency)} icon={Receipt} change={clientKpis.aovChange} />
        <StatCard label="Gross profit" value={formatMoney(clientKpis.grossProfit, currency)} icon={TrendingUp} hint={`${clientKpis.grossMargin}% margin`} tone="gold" />
        <StatCard label="Branches" value={branches?.length ?? 0} icon={Users} hint="Reporting locations" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="Revenue trend" description="Daily revenue this week" className="lg:col-span-2">
          <TrendAreaChart data={revenueByDay} xKey="day" series={[{ key: "revenue", name: "Revenue" }]} formatter={(v) => formatCompact(v)} height={300} />
        </SectionCard>
        <SectionCard title="Payment methods" description="Share of collected payments">
          <DonutChart data={paymentSplit} formatter={(v) => `${v}%`} height={300} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Branch performance" description="Revenue by location">
          {branchPerformance.length > 0 ? (
            <SimpleBarChart data={branchPerformance} xKey="name" series={[{ key: "revenue", name: "Revenue" }]} formatter={(v) => formatCompact(v)} layout="vertical" height={280} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Add a branch to compare locations.</p>
          )}
        </SectionCard>
        <SectionCard title="Top selling items" description="Units and revenue in the last 7 days">
          <SimpleBarChart data={topProducts} xKey="name" series={[{ key: "revenue", name: "Revenue" }]} formatter={(v) => formatCompact(v)} layout="vertical" height={280} />
        </SectionCard>
      </div>
    </>
  );
}
