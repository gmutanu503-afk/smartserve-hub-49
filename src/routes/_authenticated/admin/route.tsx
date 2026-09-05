import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ScrollText,
  Settings,
  ToggleLeft,
  Users,
} from "lucide-react";
import { AppShell, type NavGroup } from "@/components/layout/AppShell";
import { FullPageLoader } from "@/components/kit/FullPageLoader";
import { fetchCurrentUser, useCurrentUser } from "@/lib/auth/use-auth";

const groups: NavGroup[] = [
  {
    items: [
      { label: "Overview", to: "/admin", icon: LayoutDashboard, exact: true },
      { label: "Clients", to: "/admin/clients", icon: Building2 },
      { label: "Subscriptions", to: "/admin/subscriptions", icon: CreditCard },
      { label: "Plans", to: "/admin/plans", icon: Package },
      { label: "Feature control", to: "/admin/features", icon: ToggleLeft },
      { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Users & roles", to: "/admin/users", icon: Users },
      { label: "Audit logs", to: "/admin/audit", icon: ScrollText },
      { label: "Support", to: "/admin/support", icon: LifeBuoy, comingSoon: true },
      { label: "Settings", to: "/admin/settings", icon: Settings },
    ],
  },
];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    if (!user.isPlatformAdmin) throw redirect({ to: "/app", replace: true });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { data: user } = useCurrentUser();
  if (!user) return <FullPageLoader />;
  return (
    <AppShell user={user} groups={groups} subtitle="Control Center" contextLabel="Platform · All clients">
      <Outlet />
    </AppShell>
  );
}
