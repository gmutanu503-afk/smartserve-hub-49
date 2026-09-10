import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/kit/DataTable";
import { PageHeader } from "@/components/kit/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { setPlatformUserRole } from "@/lib/admin.functions";
import { ROLE_LABELS, useCurrentUser, type AppRole } from "@/lib/auth/use-auth";
import { formatRelative, initials } from "@/lib/format";
import { platformUsersQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & roles — SmartServe Control Center" },
      { name: "description", content: "Every SmartServe user, their organization and their platform role." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

type Row = { id: string; full_name: string; email: string; last_seen_at: string | null; is_active: boolean; organizations: { name: string } | null; roles: string[] };

function UsersPage() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: users, isLoading } = useQuery(platformUsersQuery);
  const fn = useServerFn(setPlatformUserRole);
  const [search, setSearch] = useState("");

  const setRole = useMutation({
    mutationFn: (v: { userId: string; role: "super_admin" | "platform_admin"; grant: boolean }) => fn({ data: v }),
    onSuccess: (_, v) => { toast.success(v.grant ? "Platform role granted" : "Platform role revoked"); qc.invalidateQueries({ queryKey: ["platform-users"] }); },
    onError: (e: Error) => toast.error("Could not change role", { description: e.message }),
  });

  const q = search.trim().toLowerCase();
  const rows = ((users ?? []) as unknown as Row[]).filter(
    (u) => !q || u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q) || (u.organizations?.name ?? "").toLowerCase().includes(q),
  );

  return (
    <>
      <PageHeader eyebrow="Access" title="Users & roles" description="Platform roles are managed here. Client-side roles are managed inside each client account." />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" className="pl-9" />
      </div>
      <DataTable
        loading={isLoading}
        rows={rows}
        rowKey={(u) => u.id}
        empty="No users match your search."
        columns={[
          {
            key: "user", header: "User", cell: (u) => (
              <div className="flex items-center gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">{initials(u.full_name || u.email)}</span>
                <div><p className="font-medium">{u.full_name || "—"}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
              </div>
            ),
          },
          { key: "org", header: "Organization", cell: (u) => u.organizations?.name ?? <span className="text-muted-foreground">Platform</span> },
          {
            key: "roles", header: "Roles", cell: (u) => (
              <div className="flex flex-wrap gap-1">
                {u.roles.length === 0 && <span className="text-muted-foreground">—</span>}
                {u.roles.map((r) => (
                  <Badge key={r} variant={r === "super_admin" ? "gold" : r === "platform_admin" ? "info" : "secondary"}>
                    {ROLE_LABELS[r as AppRole] ?? r}
                  </Badge>
                ))}
              </div>
            ),
          },
          { key: "seen", header: "Last seen", cell: (u) => <span className="text-muted-foreground">{formatRelative(u.last_seen_at)}</span> },
          { key: "active", header: "Account", cell: (u) => <Badge variant={u.is_active ? "success" : "muted"}>{u.is_active ? "Active" : "Disabled"}</Badge> },
          {
            key: "platform", header: <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5" /> Platform admin</span>, cell: (u) => (
              <Switch
                checked={u.roles.includes("platform_admin") || u.roles.includes("super_admin")}
                disabled={!me?.isSuperAdmin || u.roles.includes("super_admin") || setRole.isPending}
                onCheckedChange={(v) => setRole.mutate({ userId: u.id, role: "platform_admin", grant: v })}
                aria-label={`Toggle platform admin for ${u.email}`}
              />
            ),
          },
        ]}
      />
      {!me?.isSuperAdmin && <p className="mt-3 text-xs text-muted-foreground">Only Super Admins can grant or revoke platform roles.</p>}
    </>
  );
}
