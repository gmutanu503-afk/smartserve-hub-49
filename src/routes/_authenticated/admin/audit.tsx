import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/kit/DataTable";
import { PageHeader } from "@/components/kit/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime, titleCase } from "@/lib/format";
import { auditLogsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit logs — SmartServe Control Center" },
      { name: "description", content: "A complete trail of every administrative action taken on SmartServe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditPage,
});

function toneFor(action: string) {
  if (action.includes("suspend") || action.includes("revoked") || action.includes("disabled")) return "danger" as const;
  if (action.includes("created") || action.includes("granted") || action.includes("enabled") || action.includes("reactivated")) return "success" as const;
  return "info" as const;
}

function AuditPage() {
  const { data: logs, isLoading } = useQuery(auditLogsQuery);
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const rows = (logs ?? []).filter(
    (l) => !q || l.action.toLowerCase().includes(q) || (l.actor_email ?? "").toLowerCase().includes(q) || (l.organizations?.name ?? "").toLowerCase().includes(q),
  );

  return (
    <>
      <PageHeader eyebrow="Compliance" title="Audit logs" description="Every plan change, suspension, feature override and role change, with who did it and when." />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by action, actor or client" className="pl-9" />
      </div>
      <DataTable
        loading={isLoading}
        rows={rows}
        rowKey={(l) => l.id}
        empty="No activity recorded yet."
        columns={[
          { key: "when", header: "When", cell: (l) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(l.created_at)}</span> },
          { key: "action", header: "Action", cell: (l) => <Badge variant={toneFor(l.action)}>{titleCase(l.action.replace(/\./g, " "))}</Badge> },
          { key: "actor", header: "Actor", cell: (l) => <div><p className="font-medium">{l.actor_email ?? "System"}</p><p className="text-xs text-muted-foreground">{l.actor_role ? titleCase(l.actor_role) : "—"}</p></div> },
          { key: "client", header: "Client", cell: (l) => l.organizations?.name ?? "—" },
          { key: "target", header: "Target", cell: (l) => <span className="text-muted-foreground">{l.target_type ? titleCase(l.target_type) : "—"}</span> },
          {
            key: "meta", header: "Details", cell: (l) => (
              <code className="block max-w-[320px] truncate rounded bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
                {JSON.stringify(l.metadata)}
              </code>
            ),
          },
        ]}
      />
    </>
  );
}
