import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile | null;
  roles: AppRole[];
  organization: Organization | null;
  isPlatformAdmin: boolean;
  isSuperAdmin: boolean;
  isClientAdmin: boolean;
  primaryRole: AppRole | null;
}

export const currentUserQueryKey = ["current-user"] as const;

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role, organization_id").eq("user_id", user.id),
  ]);

  const roles = (roleRows ?? []).map((r) => r.role);
  let organization: Organization | null = null;
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .maybeSingle();
    organization = org ?? null;
  }

  const isSuperAdmin = roles.includes("super_admin");
  const isPlatformAdmin = isSuperAdmin || roles.includes("platform_admin");
  const isClientAdmin = roles.includes("client_admin");
  const priority: AppRole[] = ["super_admin", "platform_admin", "client_admin", "branch_manager", "staff"];
  const primaryRole = priority.find((r) => roles.includes(r)) ?? null;

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    profile: profile ?? null,
    roles,
    organization,
    isPlatformAdmin,
    isSuperAdmin,
    isClientAdmin,
    primaryRole,
  };
}

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });
}

export function homePathFor(user: CurrentUser | null | undefined): "/admin" | "/app" | "/auth" {
  if (!user) return "/auth";
  if (user.isPlatformAdmin) return "/admin";
  return "/app";
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  platform_admin: "Platform Admin",
  client_admin: "Client Admin",
  branch_manager: "Branch Manager",
  staff: "Staff",
};
