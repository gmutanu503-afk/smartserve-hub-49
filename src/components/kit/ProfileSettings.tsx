import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/kit/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, currentUserQueryKey, useSignOut, type CurrentUser } from "@/lib/auth/use-auth";

/** Shared profile editor used by both the platform and client settings pages. */
export function ProfileSettings({ user }: { user: CurrentUser }) {
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [fullName, setFullName] = useState(user.profile?.full_name ?? "");
  const [phone, setPhone] = useState(user.profile?.phone ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: currentUserQueryKey }); },
    onError: (e: Error) => toast.error("Could not save profile", { description: e.message }),
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/auth` });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Password reset link sent", { description: `Check ${user.email}.` }),
    onError: (e: Error) => toast.error("Could not send reset link", { description: e.message }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Your profile" description="This is how your name appears across SmartServe.">
        <div className="space-y-4">
          <div>
            <Label htmlFor="p-name">Full name</Label>
            <Input id="p-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="p-email">Email</Label>
            <Input id="p-email" value={user.email} disabled />
          </div>
          <div>
            <Label htmlFor="p-phone">Phone</Label>
            <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254…" />
          </div>
          <Button variant="gold" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save changes"}</Button>
        </div>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard title="Access" description="Roles decide what you can see and do.">
          <div className="flex flex-wrap gap-2">
            {user.roles.length === 0 && <span className="text-sm text-muted-foreground">No roles assigned yet.</span>}
            {user.roles.map((r) => (
              <Badge key={r} variant={r === "super_admin" ? "gold" : "secondary"}>{ROLE_LABELS[r]}</Badge>
            ))}
          </div>
          {user.organization && (
            <p className="mt-4 text-sm text-muted-foreground">
              Organization: <span className="font-medium text-foreground">{user.organization.name}</span>
            </p>
          )}
        </SectionCard>

        <SectionCard title="Security">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={resetPassword.isPending} onClick={() => resetPassword.mutate()}>Send password reset link</Button>
            <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
