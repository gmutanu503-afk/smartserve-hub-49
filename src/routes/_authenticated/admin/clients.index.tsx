import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/kit/DataTable";
import { EmptyState } from "@/components/kit/EmptyState";
import { PageHeader } from "@/components/kit/PageHeader";
import { OrgStatusBadge, PlanBadge, SubscriptionStatusBadge } from "@/components/kit/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOrganization } from "@/lib/admin.functions";
import { formatDate, formatRelative } from "@/lib/format";
import { latestSubscription, organizationsQuery, plansQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — SmartServe Control Center" },
      { name: "description", content: "Manage every restaurant, café, bar and hotel on SmartServe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

const BUSINESS_TYPES = ["restaurant", "cafe", "bar", "hotel"] as const;

function ClientsPage() {
  const navigate = useNavigate();
  const { data: orgs, isLoading } = useQuery(organizationsQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const rows = (orgs ?? [])
    .map((o) => ({ org: o, sub: latestSubscription(o.subscriptions) }))
    .filter((r) => status === "all" || r.org.status === status)
    .filter((r) => {
      const q = search.trim().toLowerCase();
      return !q || r.org.name.toLowerCase().includes(q) || r.org.owner_email.toLowerCase().includes(q);
    });

  return (
    <>
      <PageHeader
        eyebrow="Client management"
        title="Clients"
        description={`${orgs?.length ?? 0} organizations on the platform.`}
        actions={<CreateClientDialog />}
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or owner email" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!isLoading && orgs?.length === 0 ? (
        <div className="surface-card">
          <EmptyState icon={Building2} title="No clients yet" description="Create your first client to provision an organization, a main branch and a subscription." action={<CreateClientDialog />} />
        </div>
      ) : (
        <DataTable
          loading={isLoading}
          rows={rows}
          rowKey={(r) => r.org.id}
          onRowClick={(r) => navigate({ to: "/admin/clients/$id", params: { id: r.org.id } })}
          empty="No clients match your filters."
          columns={[
            { key: "name", header: "Client", cell: (r) => <div><p className="font-medium">{r.org.name}</p><p className="text-xs text-muted-foreground">{r.org.owner_email}</p></div> },
            { key: "type", header: "Type", className: "capitalize", cell: (r) => r.org.business_type },
            { key: "plan", header: "Plan", cell: (r) => (r.sub?.plans ? <PlanBadge code={r.sub.plans.code} name={r.sub.plans.name} /> : "—") },
            { key: "sub", header: "Subscription", cell: (r) => (r.sub ? <SubscriptionStatusBadge status={r.sub.status} /> : "—") },
            { key: "org", header: "Account", cell: (r) => <OrgStatusBadge status={r.org.status} /> },
            { key: "branches", header: "Branches", cell: (r) => r.org.branches?.[0]?.count ?? 0 },
            { key: "users", header: "Users", cell: (r) => r.org.profiles?.[0]?.count ?? 0 },
            { key: "renewal", header: "Renewal", cell: (r) => formatDate(r.sub?.renewal_at) },
            { key: "activity", header: "Last activity", cell: (r) => <span className="text-muted-foreground">{formatRelative(r.org.last_activity_at)}</span> },
          ]}
        />
      )}
    </>
  );
}

function CreateClientDialog() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: plans } = useQuery(plansQuery);
  const create = useServerFn(createOrganization);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", businessType: "restaurant" as (typeof BUSINESS_TYPES)[number], ownerName: "", ownerEmail: "", phone: "", country: "KE", planId: "", startAsTrial: true });

  const mutation = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: async (res) => {
      toast.success("Client created", { description: `${form.name} is ready with a main branch and subscription.` });
      await qc.invalidateQueries({ queryKey: ["organizations"] });
      setOpen(false);
      navigate({ to: "/admin/clients/$id", params: { id: res.organizationId } });
    },
    onError: (e: Error) => toast.error("Could not create client", { description: e.message }),
  });

  const planId = form.planId || plans?.[0]?.id || "";
  const valid = form.name.length >= 2 && form.ownerName.length >= 2 && /\S+@\S+\.\S+/.test(form.ownerEmail) && planId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold"><Plus /> New client</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Create client</DialogTitle>
          <DialogDescription>Provisions an organization, its main branch and a subscription. The owner can then sign up with this email.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="c-name">Business name</Label>
            <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Savanna Grill" />
          </div>
          <div>
            <Label>Business type</Label>
            <Select value={form.businessType} onValueChange={(v) => setForm({ ...form, businessType: v as typeof form.businessType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>{plans?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · ${p.price_monthly}/mo</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="c-owner">Owner name</Label>
            <Input id="c-owner" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="c-email">Owner email</Label>
            <Input id="c-email" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="c-phone">Phone</Label>
            <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254…" />
          </div>
          <div>
            <Label htmlFor="c-country">Country code</Label>
            <Input id="c-country" value={form.country} maxLength={4} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={form.startAsTrial} onCheckedChange={(v) => setForm({ ...form, startAsTrial: Boolean(v) })} />
            Start with a 14-day free trial
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gold" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Creating…" : "Create client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
