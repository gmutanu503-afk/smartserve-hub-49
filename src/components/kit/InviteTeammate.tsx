import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, MailPlus, RotateCcw, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/kit/DataTable";
import { SectionCard } from "@/components/kit/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRelative } from "@/lib/format";
import { INVITABLE_ROLES, invitationLink, invitationsQuery } from "@/lib/invitations";
import { myBranchesQuery } from "@/lib/queries";

type Props = { orgId: string; orgName: string; inviterEmail: string; inviterId: string };

/** Invite dialog + pending invitation list, used by managers on the Staff page. */
export function InviteTeammate({ orgId, orgName, inviterEmail, inviterId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: branches } = useQuery({ ...myBranchesQuery(orgId), enabled: Boolean(orgId) });
  const { data: invitations, isLoading } = useQuery({ ...invitationsQuery(orgId), enabled: Boolean(orgId) });
  const [form, setForm] = useState({ email: "", fullName: "", role: "staff", branchId: "none", message: "" });

  const invite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          organization_id: orgId,
          email: form.email.trim().toLowerCase(),
          full_name: form.fullName.trim() || null,
          role: form.role as "branch_manager" | "staff",
          branch_id: form.branchId === "none" ? null : form.branchId,
          message: form.message.trim() || null,
          invited_by: inviterId,
          invited_by_email: inviterEmail,
        })
        .select("token, email")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (row) => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "invitations"] });
      setOpen(false);
      setForm({ email: "", fullName: "", role: "staff", branchId: "none", message: "" });
      await copyLink(row.token, `Invitation created for ${row.email}`);
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("duplicate") ? "That person already has a pending invitation." : "Could not create the invitation",
        { description: e.message },
      ),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Invitation cancelled"); qc.invalidateQueries({ queryKey: ["org", orgId, "invitations"] }); },
    onError: (e: Error) => toast.error("Could not cancel", { description: e.message }),
  });

  const renew = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "pending", expires_at: new Date(Date.now() + 14 * 864e5).toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Invitation renewed for another 14 days"); qc.invalidateQueries({ queryKey: ["org", orgId, "invitations"] }); },
    onError: (e: Error) => toast.error("Could not renew", { description: e.message }),
  });

  async function copyLink(token: string, title = "Invite link copied") {
    try {
      await navigator.clipboard.writeText(invitationLink(token));
      toast.success(title, { description: "Paste it into a message or email to your teammate." });
    } catch {
      toast.info(invitationLink(token));
    }
  }

  function mailTo(email: string, token: string) {
    const body = `Hi,\n\n${orgName} has invited you to join their SmartServe workspace.\n\nCreate your account here:\n${invitationLink(token)}\n\nUse this exact email address (${email}) when signing up so you land in the right workspace.\n\nSee you inside,\n${inviterEmail}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(`You're invited to join ${orgName} on SmartServe`)}&body=${encodeURIComponent(body)}`;
  }

  const pending = (invitations ?? []).filter((i) => i.status !== "accepted");

  return (
    <>
      <Button variant="gold" onClick={() => setOpen(true)}><UserPlus /> Invite teammate</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Invite a teammate</DialogTitle>
            <DialogDescription>
              They'll only ever see {orgName}'s data — never another business's dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="i-name">Full name</Label><Input id="i-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Amina Otieno" /></div>
              <div><Label htmlFor="i-email">Work email</Label><Input id="i-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="amina@example.com" /></div>
              <div>
                <Label htmlFor="i-role">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger id="i-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVITABLE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="i-branch">Branch</Label>
                <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
                  <SelectTrigger id="i-branch"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All branches</SelectItem>
                    {(branches ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="i-msg">Personal note (optional)</Label>
              <Textarea id="i-msg" rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Welcome aboard! Your shifts start Monday." />
            </div>
            <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
              We'll create the invite link and copy it for you. Use the <MailPlus className="inline size-3" /> button on the invitation to open a ready-written email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="gold" disabled={!form.email.includes("@") || invite.isPending} onClick={() => invite.mutate()}>
              {invite.isPending ? "Creating…" : "Create invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
