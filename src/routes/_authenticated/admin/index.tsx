import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kit/PageHeader";
import { EmptyState } from "@/components/kit/EmptyState";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Control Center — SmartServe" }, { name: "robots", content: "noindex" }] }),
  component: AdminHome,
});

function AdminHome() {
  return (
    <>
      <PageHeader eyebrow="Super Admin" title="Control Center" description="Platform-wide overview of clients, subscriptions and revenue." />
      <EmptyState icon={Construction} title="Dashboard coming next" description="Client, subscription and analytics modules will appear here." />
    </>
  );
}
