import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/kit/DataTable";
import { PageHeader } from "@/components/kit/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth/use-auth";
import { formatDate } from "@/lib/format";
import { myBranchesQuery, mySubscriptionQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/app/branches")({
  head: () => ({
    meta: [
      { title: "Branches — SmartServe" },
      { name: "description", content: "Manage the locations your venue operates on SmartServe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BranchesPage,
});

function BranchesPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const orgId = user?.organization?.id ?? "";
  const { data: branches, isLoading } = useQuery({ ...myBranchesQuery(orgId), enabled: Boolean(orgId) });
  const { data: sub } = useQuery({ ...mySubscriptionQuery(orgId), enabled: Boolean(orgId) });
  const canManage = user?.isClientAdmin ?? false;
  const limit = sub?.plans?.branch_limit;
  const atLimit = limit !== undefined && (branches?.length ?? 0) >= limit;

  const toggle = useMutation({
    mutationFn: async (v: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("branches").update({ is_active: v.is_active }).eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "branches"] }),
    onError: (e: Error) => toast.error("Could not update branch", { description: e.message }),
  });

  return (
    <>
      <PageHeader
        eyebrow="Locations"
        title="Branches"
        description={limit ? `${branches?.length ?? 0} of ${limit} branches used on your plan.` : "Every location you operate."}
        actions={canManage ? <AddBranchDialog orgId={orgId} disabled={atLimit} /> : undefined}
      />
      {atLimit && <p className="mb-4 rounded-lg border border-gold/40 bg-gold-soft px-4 py-2.5 text-sm">You've reached your plan's branch limit. Upgrade your plan to add more locations.</p>}
      <DataTable
        loading={isLoading}
        rows={branches}
        rowKey={(b) => b.id}
        empty="No branches yet — add your first location."
        columns={[
          { key: "name", header: "Branch", cell: (b) => <div className="flex items-center gap-3"><Store className="size-4 text-muted-foreground" /><span className="font-medium">{b.name}</span></div> },
          { key: "address", header: "Address", cell: (b) => b.address ?? "—" },
          { key: "city", header: "City", cell: (b) => b.city ?? "—" },
          { key: "phone", header: "Phone", cell: (b) => b.phone ?? "—" },
          { key: "created", header: "Added", cell: (b) => <span className="text-muted-foreground">{formatDate(b.created_at)}</span> },
          {
            key: "status", header: "Status", cell: (b) =>
              canManage ? (
                <div className="flex items-center gap-2">
                  <Switch checked={b.is_active} onCheckedChange={(v) => toggle.mutate({ id: b.id, is_active: v })} aria-label={`Toggle ${b.name}`} />
                  <span className="text-xs text-muted-foreground">{b.is_active ? "Active" : "Paused"}</span>
                </div>
              ) : (
                <Badge variant={b.is_active ? "success" : "muted"}>{b.is_active ? "Active" : "Paused"}</Badge>
              ),
          },
        ]}
      />
    </>
  );
}

function AddBranchDialog({ orgId, disabled }: { orgId: string; disabled: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert({
        organization_id: orgId,
        name: form.name,
        address: form.address || null,
        city: form.city || null,
        phone: form.phone || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Branch added");
      qc.invalidateQueries({ queryKey: ["org", orgId, "branches"] });
      setForm({ name: "", address: "", city: "", phone: "" });
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Could not add branch", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" disabled={disabled}><Plus /> Add branch</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add branch</DialogTitle>
          <DialogDescription>Locations let you compare performance and assign staff.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="b-name">Branch name</Label><Input id="b-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Westlands" /></div>
          <div className="sm:col-span-2"><Label htmlFor="b-addr">Address</Label><Input id="b-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label htmlFor="b-city">City</Label><Input id="b-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label htmlFor="b-phone">Phone</Label><Input id="b-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gold" disabled={form.name.length < 2 || add.isPending} onClick={() => add.mutate()}>{add.isPending ? "Adding…" : "Add branch"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
