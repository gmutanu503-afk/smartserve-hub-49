import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Ban, CalendarPlus, CheckCircle2, Mail, MapPin, Phone, ShieldCheck, Store, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FullPageLoader } from "@/components/kit/FullPageLoader";
import { PageHeader, SectionCard } from "@/components/kit/PageHeader";
import { StatCard } from "@/components/kit/StatCard";
import { OrgStatusBadge, PaymentStatusBadge, PlanBadge, SubscriptionStatusBadge } from "@/components/kit/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { changeOrganizationPlan, setOrganizationFeature, setOrganizationSuspension, updateSubscriptionDates } from "@/lib/admin.functions";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/use-auth";
import { daysUntil, formatDate, formatMoney, formatRelative } from "@/lib/format";
import { featureFlagsQuery, latestSubscription, organizationDetailQuery, orgUsageQuery, plansQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/clients/$id")({
  head: () => ({ meta: [{ title: "Client profile — SmartServe Control Center" }, { name: "robots", content: "noindex" }] }),
  component: ClientProfile,
});

function ClientProfile() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: org, isLoading } = useQuery(organizationDetailQuery(id));
  const { data: usage } = useQuery(orgUsageQuery(id));
  const { data: plans } = useQuery(plansQuery);
  const { data: flags } = useQuery(featureFlagsQuery);

  const suspendFn = useServerFn(setOrganizationSuspension);
  const planFn = useServerFn(changeOrganizationPlan);
  const datesFn = useServerFn(updateSubscriptionDates);
  const featureFn = useServerFn(setOrganizationFeature);

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["organizations"] }), qc.invalidateQueries({ queryKey: ["audit-logs"] })]);
  const onError = (e: Error) => toast.error("Action failed", { description: e.message });

  const suspend = useMutation({ mutationFn: (s: boolean) => suspendFn({ data: { organizationId: id, suspend: s } }), onSuccess: (_, s) => { toast.success(s ? "Account suspended" : "Account reactivated"); refresh(); }, onError });
  const changePlan = useMutation({ mutationFn: (v: { planId: string; approveUpgrade?: boolean }) => planFn({ data: { organizationId: id, ...v } }), onSuccess: () => { toast.success("Plan updated"); refresh(); }, onError });
  const extend = useMutation({ mutationFn: (days: number) => datesFn({ data: { organizationId: id, trialEndsAt: new Date(Date.now() + days * 864e5).toISOString() } }), onSuccess: () => { toast.success("Trial extended"); refresh(); }, onError });
  const toggleFeature = useMutation({ mutationFn: (v: { featureKey: string; enabled: boolean }) => featureFn({ data: { organizationId: id, ...v } }), onSuccess: () => refresh(), onError });

  const [planId, setPlanId] = useState<string>("");

  if (isLoading || !org) return <FullPageLoader label="Loading client…" />;

  const sub = latestSubscription(org.subscriptions);
  const suspended = org.status === "suspended";
  const planFeatureKeys = new Set(plans?.find((p) => p.id === sub?.plan_id)?.plan_features.map((f) => f.feature_key) ?? []);
  const overrides = new Map(org.organization_features.map((f) => [f.feature_key, f.enabled]));
  const renewalDays = daysUntil(sub?.renewal_at);

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
        <Link to="/admin/clients"><ArrowLeft /> All clients</Link>
      </Button>
      <PageHeader
        eyebrow={org.business_type}
        title={org.name}
        description={`Owner: ${org.owner_name} · ${org.owner_email}`}
        actions={
          <>
            <OrgStatusBadge status={org.status} />
            {suspended ? (
              <Button variant="gold" disabled={suspend.isPending} onClick={() => suspend.mutate(false)}><CheckCircle2 /> Reactivate</Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive"><Ban /> Suspend</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspend {org.name}?</AlertDialogTitle>
                    <AlertDialogDescription>All staff will be locked out immediately. Data is preserved and access is restored the moment you reactivate.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => suspend.mutate(true)}>Suspend account</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plan" value={sub?.plans?.name ?? "—"} hint={sub ? `${formatMoney(sub.price, sub.currency)} / ${sub.billing_cycle}` : undefined} tone="navy" />
        <StatCard label="Renewal" value={formatDate(sub?.renewal_at)} hint={renewalDays === null ? undefined : renewalDays < 0 ? `${Math.abs(renewalDays)} days overdue` : `in ${renewalDays} days`} tone={renewalDays !== null && renewalDays <= 7 ? "gold" : "default"} />
        <StatCard label="Branches" value={org.branches.length} icon={Store} hint={`limit ${sub?.plans?.branch_limit ?? "—"}`} />
        <StatCard label="Users" value={org.profiles.length} icon={Users} hint={`limit ${sub?.plans?.user_limit ?? "—"}`} />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-6 lg:grid-cols-3">
          <SectionCard title="Business details" className="lg:col-span-2">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail icon={Mail} label="Owner email" value={org.owner_email} />
              <Detail icon={Phone} label="Phone" value={org.phone ?? "—"} />
              <Detail icon={MapPin} label="Country" value={org.country ?? "—"} />
              <Detail icon={ShieldCheck} label="Currency" value={org.currency} />
              <Detail label="Created" value={formatDate(org.created_at)} />
              <Detail label="Last activity" value={formatRelative(org.last_activity_at)} />
            </dl>
          </SectionCard>
          <SectionCard title="Usage">
            <ul className="space-y-3 text-sm">
              <UsageRow label="Orders" value={usage?.orders} />
              <UsageRow label="Tables" value={usage?.tables} limit={sub?.plans?.table_limit} />
              <UsageRow label="Menu items" value={usage?.menuItems} />
              <UsageRow label="Branches" value={org.branches.length} limit={sub?.plans?.branch_limit} />
              <UsageRow label="Users" value={org.profiles.length} limit={sub?.plans?.user_limit} />
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="subscription" className="mt-4 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Current subscription">
            {sub ? (
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {sub.plans && <PlanBadge code={sub.plans.code} name={sub.plans.name} />}
                  <SubscriptionStatusBadge status={sub.status} />
                  <PaymentStatusBadge status={sub.payment_status} />
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <Detail label="Price" value={`${formatMoney(sub.price, sub.currency)} / ${sub.billing_cycle}`} />
                  <Detail label="Started" value={formatDate(sub.started_at)} />
                  <Detail label="Trial ends" value={formatDate(sub.trial_ends_at)} />
                  <Detail label="Renews" value={formatDate(sub.renewal_at)} />
                  <Detail label="Last payment" value={formatDate(sub.last_payment_at)} />
                </dl>
                {sub.pending_plan && (
                  <div className="flex items-center justify-between rounded-lg border border-gold/40 bg-gold-soft p-3">
                    <div>
                      <p className="font-semibold">Upgrade requested → {sub.pending_plan.name}</p>
                      <p className="text-xs text-muted-foreground">The client asked to move to this plan.</p>
                    </div>
                    <Button variant="gold" size="sm" disabled={changePlan.isPending} onClick={() => changePlan.mutate({ planId: sub.pending_plan!.id, approveUpgrade: true })}>Approve</Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription yet.</p>
            )}
          </SectionCard>
          <SectionCard title="Manage" description="Changes are logged to the audit trail.">
            <div className="space-y-5">
              <div>
                <Label>Change plan</Label>
                <div className="mt-1.5 flex gap-2">
                  <Select value={planId || sub?.plan_id || ""} onValueChange={setPlanId}>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>{plans?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · ${p.price_monthly}/mo</SelectItem>)}</SelectContent>
                  </Select>
                  <Button disabled={!planId || planId === sub?.plan_id || changePlan.isPending} onClick={() => changePlan.mutate({ planId })}>Apply</Button>
                </div>
              </div>
              <div>
                <Label>Extend trial / expiry</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[7, 14, 30].map((d) => (
                    <Button key={d} variant="outline-gold" size="sm" disabled={!sub || extend.isPending} onClick={() => extend.mutate(d)}>
                      <CalendarPlus /> +{d} days
                    </Button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Sets the trial end and renewal date from today; suspended trials are reactivated.</p>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <SectionCard title="Feature access" description="Plan features are on by default. Overrides let you enable or disable any feature for this client only." bodyClassName="p-0">
            <ul className="divide-y">
              {flags?.map((f) => {
                const override = overrides.get(f.key);
                const enabled = override ?? planFeatureKeys.has(f.key);
                return (
                  <li key={f.key} className="flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <Badge variant={override !== undefined ? "gold" : planFeatureKeys.has(f.key) ? "secondary" : "muted"}>
                      {override !== undefined ? "Override" : planFeatureKeys.has(f.key) ? "In plan" : "Not in plan"}
                    </Badge>
                    <Switch checked={enabled} disabled={toggleFeature.isPending} onCheckedChange={(v) => toggleFeature.mutate({ featureKey: f.key, enabled: v })} />
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="branches" className="mt-4">
          <SectionCard title="Branches" bodyClassName="p-0">
            <ul className="divide-y">
              {org.branches.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Store className="size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{[b.address, b.city].filter(Boolean).join(", ") || "No address"}</p>
                  </div>
                  <Badge variant={b.is_active ? "success" : "muted"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                </li>
              ))}
              {org.branches.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No branches.</li>}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <SectionCard title="Staff & admins" bodyClassName="p-0">
            <ul className="divide-y">
              {org.profiles.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{p.full_name || p.email}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Seen {formatRelative(p.last_seen_at)}</span>
                  <Badge variant={p.is_active ? "success" : "muted"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </li>
              ))}
              {org.profiles.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No users yet. When {org.owner_email} signs up they'll be linked automatically as {ROLE_LABELS["client_admin" as AppRole]}.
                </li>
              )}
            </ul>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Detail({ icon: Icon, label, value }: { icon?: typeof Mail; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="size-3.5" />} {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function UsageRow({ label, value, limit }: { label: string; value: number | undefined; limit?: number }) {
  const pct = limit && value !== undefined ? Math.min(100, Math.round((value / limit) * 100)) : null;
  return (
    <li>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value ?? "…"}{limit ? <span className="font-normal text-muted-foreground"> / {limit}</span> : null}</span>
      </div>
      {pct !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className={pct >= 90 ? "h-full bg-danger" : "h-full bg-gold"} style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  );
}
