import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/kit/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePlan } from "@/lib/admin.functions";
import { useCurrentUser } from "@/lib/auth/use-auth";
import { formatMoney } from "@/lib/format";
import { featureFlagsQuery, plansQuery, type PlanWithFeatures } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({
    meta: [
      { title: "Plans — SmartServe Control Center" },
      { name: "description", content: "Configure SmartServe subscription plans, limits and included features." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { data: plans, isLoading } = useQuery(plansQuery);
  const { data: flags } = useQuery(featureFlagsQuery);
  const { data: user } = useCurrentUser();
  const [editing, setEditing] = useState<PlanWithFeatures | null>(null);
  const flagNames = new Map(flags?.map((f) => [f.key, f.name]));

  return (
    <>
      <PageHeader eyebrow="Catalog" title="Subscription plans" description="Pricing, limits and the features each plan unlocks. Only Super Admins can edit plans." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="surface-card h-72 animate-pulse" />)}
        {plans?.map((p) => {
          const featured = p.code === "pro";
          return (
            <article key={p.id} className={cn("surface-card relative flex flex-col p-5", featured && "border-gold ring-1 ring-gold/40")}>
              {featured && <span className="absolute -top-2.5 left-5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">Most popular</span>}
              <h2 className="font-display text-lg font-bold">{p.name}</h2>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              <p className="mt-4 font-display text-3xl font-bold">{formatMoney(p.price_monthly, p.currency)}<span className="text-sm font-normal text-muted-foreground"> /mo</span></p>
              <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-secondary p-3 text-center text-xs">
                <div><dt className="text-muted-foreground">Users</dt><dd className="font-semibold">{p.user_limit}</dd></div>
                <div><dt className="text-muted-foreground">Branches</dt><dd className="font-semibold">{p.branch_limit}</dd></div>
                <div><dt className="text-muted-foreground">Tables</dt><dd className="font-semibold">{p.table_limit}</dd></div>
              </dl>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {p.plan_features.map((f) => (
                  <li key={f.feature_key} className="flex items-center gap-2"><Check className="size-3.5 text-gold" /> {flagNames.get(f.feature_key) ?? f.feature_key}</li>
                ))}
                {p.plan_features.length === 0 && <li className="text-muted-foreground">No features assigned</li>}
              </ul>
              <Button variant={featured ? "gold" : "outline"} className="mt-5" disabled={!user?.isSuperAdmin} onClick={() => setEditing(p)}>
                <Pencil /> Edit plan
              </Button>
            </article>
          );
        })}
      </div>
      {editing && flags && <EditPlanDialog plan={editing} flags={flags} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditPlanDialog({ plan, flags, onClose }: { plan: PlanWithFeatures; flags: { key: string; name: string; category: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const fn = useServerFn(updatePlan);
  const [form, setForm] = useState({
    priceMonthly: Number(plan.price_monthly),
    userLimit: plan.user_limit,
    branchLimit: plan.branch_limit,
    tableLimit: plan.table_limit,
    featureKeys: plan.plan_features.map((f) => f.feature_key),
  });
  const save = useMutation({
    mutationFn: () => fn({ data: { planId: plan.id, ...form } }),
    onSuccess: () => { toast.success(`${plan.name} plan updated`); qc.invalidateQueries({ queryKey: ["plans"] }); onClose(); },
    onError: (e: Error) => toast.error("Could not save plan", { description: e.message }),
  });
  const num = (k: "priceMonthly" | "userLimit" | "branchLimit" | "tableLimit") => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Edit {plan.name}</DialogTitle>
          <DialogDescription>Changes apply to all clients on this plan immediately.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Monthly price ({plan.currency})</Label><Input type="number" min={0} value={form.priceMonthly} onChange={num("priceMonthly")} /></div>
          <div><Label>User limit</Label><Input type="number" min={1} value={form.userLimit} onChange={num("userLimit")} /></div>
          <div><Label>Branch limit</Label><Input type="number" min={1} value={form.branchLimit} onChange={num("branchLimit")} /></div>
          <div><Label>Table limit</Label><Input type="number" min={1} value={form.tableLimit} onChange={num("tableLimit")} /></div>
        </div>
        <div>
          <Label>Included features</Label>
          <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
            {flags.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.featureKeys.includes(f.key)}
                  onCheckedChange={(v) => setForm({ ...form, featureKeys: v ? [...form.featureKeys, f.key] : form.featureKeys.filter((k) => k !== f.key) })}
                />
                {f.name}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gold" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save plan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
