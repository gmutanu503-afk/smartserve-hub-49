import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/kit/DataTable";
import { PageHeader } from "@/components/kit/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useCurrentUser, type AppRole } from "@/lib/auth/use-auth";
import { formatRelative, initials } from "@/lib/format";
import { myStaffQuery, mySubscriptionQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/app/staff")({
  head: () => ({
    meta: [
      { title: "Staff — SmartServe" },
      { name: "description", content: "Manage the team members who can access your SmartServe workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const orgId = user?.organization?.id ?? "";
  const { data: staff, isLoading } = useQuery({ ...myStaffQuery(orgId), enabled: Boolean(orgId) });
  const { data: sub } = useQuery({ ...mySubscriptionQuery(orgId), enabled: Boolean(orgId) });
  const canManage = user?.isClientAdmin ?? false;
  const [search, setSearch] = useState("");
  const [invite, setInvite] = useState(false);

  const toggleActive = useMutation({
    mutationFn: async (v: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_active: v.is_active }).eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "staff"] }),
    onError: (e: Error) => toast.error("Could not update team member", { description: e.message }),
  });

  const q = search.trim().toLowerCase();
  const rows = (staff ?? []).filter((s) => !q || s.email.toLowerCase().includes(q) || (s.full_name ?? "").toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Staff"
        description={sub?.plans?.user_limit ? `${staff?.length ?? 0} of ${sub.plans.user_limit} seats used on your plan.` : "Everyone with access to your workspace."}
        actions={canManage ? <Button variant="gold" onClick={() => setInvite(true)}><UserPlus /> Invite teammate</Button> : undefined}
      />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team" className="pl-9" />
      </div>
      <DataTable
        loading={isLoading}
        rows={rows}
        rowKey={(s) => s.id}
        empty="No teammates yet."
        columns={[
          {
            key: "person", header: "Team member", cell: (s) => (
              <div className="flex items-center gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">{initials(s.full_name || s.email)}</span>
                <div><p className="font-medium">{s.full_name || "—"}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>
              </div>
            ),
          },
          {
            key: "roles", header: "Role", cell: (s) => (
              <div className="flex flex-wrap gap-1">
                {s.roles.length === 0 ? <span className="text-muted-foreground">—</span> : s.roles.map((r) => <Badge key={r} variant={r === "client_admin" ? "gold" : "secondary"}>{ROLE_LABELS[r as AppRole] ?? r}</Badge>)}
              </div>
            ),
          },
          { key: "branch", header: "Branch", cell: (s) => s.branches?.name ?? "All branches" },
          { key: "seen", header: "Last seen", cell: (s) => <span className="text-muted-foreground">{formatRelative(s.last_seen_at)}</span> },
          {
            key: "status", header: "Status", cell: (s) =>
              canManage && s.id !== user?.id ? (
                <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: s.id, is_active: v })} aria-label={`Toggle ${s.email}`} />
              ) : (
                <Badge variant={s.is_active ? "success" : "muted"}>{s.is_active ? "Active" : "Disabled"}</Badge>
              ),
          },
        ]}
      />

      <Dialog open={invite} onOpenChange={setInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Invite a teammate</DialogTitle>
            <DialogDescription>
              Ask your teammate to sign up at your SmartServe sign-in page using their work email. Once they create an account they'll appear here and you can assign their branch and role.
            </DialogDescription>
          </DialogHeader>
          <Button variant="gold" onClick={() => setInvite(false)}>Got it</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
