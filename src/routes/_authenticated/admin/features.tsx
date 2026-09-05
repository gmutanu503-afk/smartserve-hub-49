import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus, SlidersHorizontal } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/kit/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { featureFlagsQuery, plansQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/features")({
  head: () => ({
    meta: [
      { title: "Feature control — SmartServe Control Center" },
      { name: "description", content: "See which SmartServe features each plan unlocks and override access per client." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { data: flags } = useQuery(featureFlagsQuery);
  const { data: plans } = useQuery(plansQuery);
  const categories = Array.from(new Set(flags?.map((f) => f.category) ?? []));

  return (
    <>
      <PageHeader
        eyebrow="Feature flags"
        title="Feature control"
        description="The plan matrix below is the default. Per-client overrides live on each client's Features tab."
        actions={<Button variant="outline-gold" asChild><Link to="/admin/plans"><SlidersHorizontal /> Edit plans</Link></Button>}
      />
      <SectionCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Feature</th>
                {plans?.map((p) => <th key={p.id} className="px-4 py-3 text-center">{p.name}</th>)}
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <FeatureGroup key={cat} category={cat} flags={flags!.filter((f) => f.category === cat)} plans={plans ?? []} />
              ))}
              {!flags && <tr><td className="px-5 py-10 text-center text-muted-foreground" colSpan={6}>Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

function FeatureGroup({ category, flags, plans }: { category: string; flags: { key: string; name: string; description: string | null; is_active: boolean }[]; plans: { id: string; plan_features: { feature_key: string }[] }[] }) {
  return (
    <>
      <tr className="bg-secondary/30">
        <td colSpan={plans.length + 2} className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{category}</td>
      </tr>
      {flags.map((f) => (
        <tr key={f.key} className="border-b last:border-0">
          <td className="px-5 py-3">
            <p className="font-medium">{f.name}</p>
            <p className="text-xs text-muted-foreground">{f.description}</p>
          </td>
          {plans.map((p) => {
            const on = p.plan_features.some((pf) => pf.feature_key === f.key);
            return (
              <td key={p.id} className="px-4 py-3 text-center">
                {on ? <Check className="mx-auto size-4 text-success" /> : <Minus className="mx-auto size-4 text-muted-foreground/50" />}
              </td>
            );
          })}
          <td className="px-4 py-3"><Badge variant={f.is_active ? "success" : "muted"}>{f.is_active ? "Live" : "Disabled"}</Badge></td>
        </tr>
      ))}
    </>
  );
}
