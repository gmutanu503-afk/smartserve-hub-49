import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { BarChart3, CreditCard, LayoutDashboard, Settings, Store, Users } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/layout/AppShell";
import { FullPageLoader } from "@/components/kit/FullPageLoader";
import { fetchCurrentUser, useCurrentUser } from "@/lib/auth/use-auth";

const groups: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", to: "/app", icon: LayoutDashboard, exact: true },
      { label: "Branches", to: "/app/branches", icon: Store },
      { label: "Staff", to: "/app/staff", icon: Users },
      { label: "Analytics", to: "/app/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Subscription", to: "/app/subscription", icon: CreditCard },
      { label: "Settings", to: "/app/settings", icon: Settings },
    ],
  },
];

export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    if (user.organization?.status === "suspended") throw redirect({ to: "/suspended", replace: true });
  },
  component: ClientLayout,
});

function ClientLayout() {
  const { data: user } = useCurrentUser();
  if (!user) return <FullPageLoader />;
  return (
    <AppShell
      user={user}
      groups={groups}
      subtitle="Workspace"
      {...(user.organization?.name ? { contextLabel: user.organization.name } : {})}
    >
      <Outlet />
    </AppShell>
  );
}
