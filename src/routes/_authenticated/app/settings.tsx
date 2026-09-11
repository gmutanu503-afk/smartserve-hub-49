import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FullPageLoader } from "@/components/kit/FullPageLoader";
import { PageHeader, SectionCard } from "@/components/kit/PageHeader";
import { ProfileSettings } from "@/components/kit/ProfileSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { currentUserQueryKey, useCurrentUser } from "@/lib/auth/use-auth";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SmartServe" },
      { name: "description", content: "Manage your venue details, contact information and personal profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientSettings,
});

function ClientSettings() {
  const { data: user } = useCurrentUser();
  if (!user) return <FullPageLoader label="Loading settings…" />;
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Your venue details and personal profile." />
      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="business" className="mt-6">
          {user.organization ? <BusinessForm orgId={user.organization.id} org={user.organization} canEdit={user.isClientAdmin} /> : <p className="text-sm text-muted-foreground">No business linked to your account yet.</p>}
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <ProfileSettings user={user} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function BusinessForm({ orgId, org, canEdit }: { orgId: string; org: { name: string; contact_email: string | null; contact_phone: string | null; country: string | null; currency: string | null; timezone: string | null }; canEdit: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: org.name,
    contact_email: org.contact_email ?? "",
    contact_phone: org.contact_phone ?? "",
    country: org.country ?? "",
    currency: org.currency ?? "KES",
    timezone: org.timezone ?? "Africa/Nairobi",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("organizations").update({
        name: form.name,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        country: form.country || null,
        currency: form.currency,
        timezone: form.timezone,
      }).eq("id", orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Business details saved"); qc.invalidateQueries({ queryKey: currentUserQueryKey }); },
    onError: (e: Error) => toast.error("Could not save details", { description: e.message }),
  });

  const field = (id: keyof typeof form, label: string, placeholder?: string) => (
    <div>
      <Label htmlFor={`o-${id}`}>{label}</Label>
      <Input id={`o-${id}`} value={form[id]} disabled={!canEdit} placeholder={placeholder} onChange={(e) => setForm({ ...form, [id]: e.target.value })} />
    </div>
  );

  return (
    <SectionCard title="Business details" description="Shown on receipts, invoices and customer-facing screens.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{field("name", "Business name")}</div>
        {field("contact_email", "Contact email")}
        {field("contact_phone", "Contact phone")}
        {field("country", "Country")}
        {field("currency", "Currency", "KES")}
        <div className="sm:col-span-2">{field("timezone", "Timezone", "Africa/Nairobi")}</div>
      </div>
      {canEdit ? (
        <Button variant="gold" className="mt-5" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save changes"}</Button>
      ) : (
        <p className="mt-5 text-xs text-muted-foreground">Only the account owner can change business details.</p>
      )}
    </SectionCard>
  );
}
