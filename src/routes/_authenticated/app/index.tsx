import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kit/PageHeader";
import { EmptyState } from "@/components/kit/EmptyState";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Dashboard — SmartServe" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <>
      <PageHeader eyebrow="Client Admin" title="Dashboard" description="Your organization at a glance." />
      <EmptyState icon={Construction} title="Dashboard coming next" description="Branches, staff, subscription and analytics will appear here." />
    </>
  ),
});
