import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kit/PageHeader";
import { EmptyState } from "@/components/kit/EmptyState";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Settings — SmartServe" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Your profile and organization preferences." />
      <EmptyState title="Settings coming next" description="Profile and organization settings will live here." />
    </>
  ),
});
