import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertOctagon, CalendarClock, CreditCard, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/kit/DataTable";
import { PageHeader } from "@/components/kit/PageHeader";
import { StatCard } from "@/components/kit/StatCard";
import { PaymentStatusBadge, PlanBadge, SUB_STATUS_LABELS, SUBSCRIPTION_STATUSES, SubscriptionStatusBadge } from "@/components/kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateSubscriptionDates } from "@/lib/admin.functions";
import type { Database } from "@/integrations/supabase/types";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import { latestSubscription, organizationsQuery } from "@/lib/queries";

type SubStatus = Database["public"]["Enums"]["subscription_status"];

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — SmartServe Control Center" },
      { name: "description", content: "Track every SmartServe subscription, renewal and payment status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const qc = useQueryClient();
  const { data: orgs, isLoading } = useQuery(organizationsQuery);
  const fn = useServerFn(updateSubscriptionDates);
  const [tab, setTab] = useState("all");

  const setStatus = useMutation({
    mutationFn: (v: { organizationId: string; status: SubStatus }) => fn({ data: v }),
    onSuccess: () => { toast.success("Subscription status updated"); qc.invalidateQueries({ queryKey: ["organizations"] }); },
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  const all = (orgs ?? []).flatMap((o) => { const sub = latestSubscription(o.subscriptions); return sub ? [{ org: o, sub }] : []; });
  const expiring = all.filter((r) => { const d = daysUntil(r.sub.renewal_at); return d !== null && d <= 7 && r.sub.status !== "CANCELLED"; });
  const due = all.filter((r) => r.sub.status === "PAYMENT_DUE" || r.sub.status === "GRACE_PERIOD" || r.sub.payment_status === "failed");
  const mrr = all.reduce((s, r) => (["ACTIVE", "PAYMENT_DUE", "GRACE_PERIOD"].includes(r.sub.status) ? s + Number(r.sub.price) : s), 0);

  const rows = tab === "expiring" ? expiring : tab === "due" ? due : tab === "trial" ? all.filter((r) => r.sub.status === "TRIAL") : all;

  return (
    <>
      <PageHeader eyebrow="Billing" title="Subscriptions" description="Renewals, trials and payment health across all clients." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active MRR" value={formatMoney(mrr)} icon={DollarSign} tone="navy" />
        <StatCard label="Subscriptions" value={all.length} icon={CreditCard} hint={`${all.filter((r) => r.sub.status === "TRIAL").length} on trial`} />
        <StatCard label="Expiring ≤ 7 days" value={expiring.length} icon={CalendarClock} tone={expiring.length ? "gold" : "default"} />
        <StatCard label="Payment issues" value={due.length} icon={AlertOctagon} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="expiring">Expiring soon</TabsTrigger>
          <TabsTrigger value="due">Payment issues</TabsTrigger>
          <TabsTrigger value="trial">Trials</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4">
        <DataTable
          loading={isLoading}
          rows={rows}
          rowKey={(r) => r.sub.id}
          empty="No subscriptions in this view."
          columns={[
            { key: "client", header: "Client", cell: (r) => <Link to="/admin/clients/$id" params={{ id: r.org.id }} className="font-medium hover:underline">{r.org.name}</Link> },
            { key: "plan", header: "Plan", cell: (r) => (r.sub.plans ? <PlanBadge code={r.sub.plans.code} name={r.sub.plans.name} /> : "—") },
            { key: "price", header: "Price", cell: (r) => `${formatMoney(r.sub.price, r.sub.currency)}/${r.sub.billing_cycle === "monthly" ? "mo" : r.sub.billing_cycle}` },
            { key: "status", header: "Status", cell: (r) => <SubscriptionStatusBadge status={r.sub.status} /> },
            { key: "pay", header: "Payment", cell: (r) => <PaymentStatusBadge status={r.sub.payment_status} /> },
            { key: "trial", header: "Trial ends", cell: (r) => formatDate(r.sub.trial_ends_at) },
            {
              key: "renewal", header: "Renewal", cell: (r) => {
                const d = daysUntil(r.sub.renewal_at);
                return <span className={d !== null && d <= 7 ? "font-semibold text-warning" : ""}>{formatDate(r.sub.renewal_at)}{d !== null && d <= 7 ? ` (${d}d)` : ""}</span>;
              },
            },
            {
              key: "actions", header: "Set status", className: "w-44", cell: (r) => (
                <Select value={r.sub.status} onValueChange={(v) => setStatus.mutate({ organizationId: r.org.id, status: v as SubStatus })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBSCRIPTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{SUB_STATUS_LABELS[s].label}</SelectItem>)}</SelectContent>
                </Select>
              ),
            },
            { key: "open", header: "", className: "text-right", cell: (r) => <Button variant="ghost" size="sm" asChild><Link to="/admin/clients/$id" params={{ id: r.org.id }}>Manage</Link></Button> },
          ]}
        />
      </div>
    </>
  );
}
