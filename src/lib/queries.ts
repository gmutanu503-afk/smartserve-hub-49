import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type FeatureFlag = Database["public"]["Tables"]["feature_flags"]["Row"];
export type Branch = Database["public"]["Tables"]["branches"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------- Catalog ---------- */
export const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: async () =>
    unwrap(await supabase.from("plans").select("*, plan_features(feature_key)").order("sort_order")),
});
export type PlanWithFeatures = Plan & { plan_features: { feature_key: string }[] };

export const featureFlagsQuery = queryOptions({
  queryKey: ["feature-flags"],
  queryFn: async () => unwrap(await supabase.from("feature_flags").select("*").order("sort_order")),
});

/* ---------- Platform admin: organizations ---------- */
export type OrgListRow = Organization & {
  subscriptions: (Subscription & { plans: Pick<Plan, "id" | "code" | "name"> | null })[];
  branches: { count: number }[];
  profiles: { count: number }[];
};

export const organizationsQuery = queryOptions({
  queryKey: ["organizations"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("organizations")
        .select("*, subscriptions(*, plans(id, code, name)), branches(count), profiles(count)")
        .order("created_at", { ascending: false }),
    ) as unknown as OrgListRow[],
});

export function latestSubscription<T extends { created_at: string }>(subs: T[] | null | undefined): T | null {
  if (!subs?.length) return null;
  return [...subs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export type OrgDetail = Organization & {
  subscriptions: (Subscription & { plans: Plan | null; pending_plan: Plan | null })[];
  branches: Branch[];
  profiles: Profile[];
  organization_features: { feature_key: string; enabled: boolean; source: string }[];
};

export const organizationDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["organizations", id],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("organizations")
          .select(
            "*, subscriptions(*, plans!subscriptions_plan_id_fkey(*), pending_plan:plans!subscriptions_pending_plan_id_fkey(*)), branches(*), profiles(*), organization_features(feature_key, enabled, source)",
          )
          .eq("id", id)
          .single(),
      ) as unknown as OrgDetail,
  });

export const orgUsageQuery = (id: string) =>
  queryOptions({
    queryKey: ["organizations", id, "usage"],
    queryFn: async () => {
      const [orders, tables, menuItems] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("organization_id", id),
        supabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("organization_id", id),
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("organization_id", id),
      ]);
      return { orders: orders.count ?? 0, tables: tables.count ?? 0, menuItems: menuItems.count ?? 0 };
    },
  });

export const auditLogsQuery = queryOptions({
  queryKey: ["audit-logs"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("audit_logs")
        .select("*, organizations(name)")
        .order("created_at", { ascending: false })
        .limit(200),
    ) as unknown as (AuditLog & { organizations: { name: string } | null })[],
});

export type PlatformUserRow = Profile & {
  organizations: { name: string } | null;
};

export const platformUsersQuery = queryOptions({
  queryKey: ["platform-users"],
  queryFn: async () => {
    const [profiles, roles] = await Promise.all([
      supabase.from("profiles").select("*, organizations(name)").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role, organization_id"),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const r of unwrap(roles)) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    }
    return (unwrap(profiles) as unknown as PlatformUserRow[]).map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
  },
});

/* ---------- Client admin ---------- */
export const myBranchesQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["org", orgId, "branches"],
    queryFn: async () =>
      unwrap(await supabase.from("branches").select("*").eq("organization_id", orgId).order("created_at")),
  });

export const myStaffQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["org", orgId, "staff"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*, branches(name)").eq("organization_id", orgId).order("created_at"),
        supabase.from("user_roles").select("user_id, role").eq("organization_id", orgId),
      ]);
      const roleMap = new Map<string, string[]>();
      for (const r of unwrap(roles)) roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
      return (unwrap(profiles) as unknown as (Profile & { branches: { name: string } | null })[]).map((p) => ({
        ...p,
        roles: roleMap.get(p.id) ?? [],
      }));
    },
  });

export const mySubscriptionQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["org", orgId, "subscription"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("subscriptions")
          .select("*, plans!subscriptions_plan_id_fkey(*, plan_features(feature_key))")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ) as unknown as (Subscription & { plans: PlanWithFeatures | null }) | null,
  });

export const myFeaturesQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["org", orgId, "features"],
    queryFn: async () => {
      const flags = unwrap(await supabase.from("feature_flags").select("*").eq("is_active", true).order("sort_order"));
      const results = await Promise.all(
        flags.map(async (f) => {
          const { data } = await supabase.rpc("org_has_feature", { _org_id: orgId, _feature_key: f.key });
          return { ...f, enabled: Boolean(data) };
        }),
      );
      return results;
    },
  });
