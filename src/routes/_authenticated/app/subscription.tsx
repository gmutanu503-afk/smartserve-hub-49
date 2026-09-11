import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Lock, Sparkles, X } from "lucide-react";
import { FullPageLoader } from "@/components/kit/FullPageLoader";
import { PageHeader, SectionCard } from "@/components/kit/PageHeader";
import { SubscriptionStatusBadge } from "@/components/kit/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/lib/auth/use-auth";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import { myBranchesQuery, myFeaturesQuery, myStaffQuery, mySubscriptionQuery, plansQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription — SmartServe" },
      { name: "description", content: "Your SmartServe plan, renewal date, usage limits and included features." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { data: user } = useCurrentUser();
  const orgId = user?.organization?.id ?? "";
  const { data: sub } = useQuery({ ...mySubscriptionQuery(orgId), enabled: Boolean(orgId) });
  const { data: plans } = useQuery(plansQuery);
  const { data: features } = useQuery({ ...myFeaturesQuery(orgId), enabled: Boolean(orgId) });
  const { data: branches } = useQuery({ ...myBranchesQuery(orgId), enabled: Boolean(orgId) });
  const { data: staff } = useQuery({ ...myStaffQuery(orgId), enabled: Boolean(orgId) });

  if (!user) return <FullPageLoader />;
  const plan = sub?.plans ?? null;
  const currency = user.organization?.currency ?? "KES";
  const trialLeft = daysUntil(sub?.trial_ends_at);

  const usage = [
    { label: "Branches", used: branches?.length ?? 0, limit: plan?.branch_limit ?? null },
    { label: "Team members", used: staff?.length ?? 0, limit: plan?.user_limit ?? null },
  ];

  return (
    <>
      <PageHeader eyebrow="Billing" title="Your subscription" description="Plan, renewal and everything included." />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Current plan" className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-display text-3xl font-bold">{plan?.name ?? "No plan"}</p>
              <p className="mt-1 text-muted-foreground">{plan ? `${formatMoney(sub?.price ?? plan.price, currency)} per ${sub?.billing_cycle === "yearly" ? "year" : "month"}` : "Contact support to choose a plan."}</p>
            </div>
            {sub && <SubscriptionStatusBadge status={sub.status} />}
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Started</dt><dd className="mt-1 font-medium">{formatDate(sub?.started_at)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Renews</dt><dd className="mt-1 font-medium">{formatDate(sub?.renewal_at)}</dd></div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Trial ends</dt>
              <dd className="mt-1 font-medium">{sub?.trial_ends_at ? `${formatDate(sub.trial_ends_at)}${trialLeft !== null ? ` (${trialLeft}d)` : ""}` : "—"}</dd>
            </div>
          </dl>
          {sub?.pending_plan_id && (
            <p className="mt-5 rounded-lg border border-gold/40 bg-gold-soft px-4 py-2.5 text-sm">
              A plan change is awaiting approval from the SmartServe team.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Usage" description="Against your plan limits">
          <div className="space-y-5">
            {usage.map((u) => {
              const pct = u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0;
              return (
                <div key={u.label}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{u.label}</span>
                    <span className="text-muted-foreground">{u.used}{u.limit ? ` / ${u.limit}` : " (unlimited)"}</span>
                  </div>
                  <Progress value={u.limit ? pct : 8} className={cn(pct >= 90 && "[&>div]:bg-danger")} />
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="What's included" description="Features active on your account" bodyClassName="p-0">
          <ul className="divide-y">
            {(features ?? []).map((f) => (
              <li key={f.key} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className={cn("inline-flex size-6 items-center justify-center rounded-md", f.enabled ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground")}>
                  {f.enabled ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.name}</p>
                  {f.description && <p className="truncate text-xs text-muted-foreground">{f.description}</p>}
                </div>
                {!f.enabled && <Lock className="size-3.5 text-muted-foreground" />}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Other plans" description="Ask your account manager to upgrade at any time.">
          <div className="space-y-3">
            {(plans ?? []).map((p) => {
              const current = p.id === plan?.id;
              return (
                <div key={p.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-4", current && "border-gold bg-gold-soft")}>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold">{p.name} {current && <Badge variant="gold" className="ml-1">Current</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{p.branch_limit ?? "Unlimited"} branches · {p.user_limit ?? "Unlimited"} users</p>
                  </div>
                  <p className="font-semibold">{formatMoney(p.price, currency)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                </div>
              );
            })}
          </div>
          <Button variant="outline-gold" className="mt-4 w-full" asChild>
            <a href="mailto:support@smartserve.app?subject=Plan%20upgrade"><Sparkles /> Request an upgrade</a>
          </Button>
        </SectionCard>
      </div>
    </>
  );
}
