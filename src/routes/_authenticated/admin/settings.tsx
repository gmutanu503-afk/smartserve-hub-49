import { createFileRoute } from "@tanstack/react-router";
import { FullPageLoader } from "@/components/kit/FullPageLoader";
import { PageHeader } from "@/components/kit/PageHeader";
import { ProfileSettings } from "@/components/kit/ProfileSettings";
import { useCurrentUser } from "@/lib/auth/use-auth";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SmartServe Control Center" },
      { name: "description", content: "Manage your SmartServe platform profile and security settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const { data: user } = useCurrentUser();
  if (!user) return <FullPageLoader label="Loading settings…" />;
  return (
    <>
      <PageHeader eyebrow="Platform" title="Settings" description="Your profile, access and security." />
      <ProfileSettings user={user} />
    </>
  );
}
