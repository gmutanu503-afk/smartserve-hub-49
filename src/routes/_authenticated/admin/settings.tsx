import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kit/PageHeader";
import { EmptyState } from "@/components/kit/EmptyState";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Platform settings — SmartServe" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <>
      <PageHeader eyebrow="Platform" title="Settings" description="Your profile and platform preferences." />
      <EmptyState title="Settings coming next" description="Profile and platform configuration will live here." />
    </>
  ),
});
