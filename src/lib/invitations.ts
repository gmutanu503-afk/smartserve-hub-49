import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"] & {
  branches: { name: string } | null;
};

/** Roles a manager may hand out. Platform roles are never selectable in the app. */
export const INVITABLE_ROLES = [
  { value: "branch_manager", label: "Branch manager", hint: "Runs one branch and can invite staff" },
  { value: "staff", label: "Staff", hint: "Works shifts, takes orders" },
] as const;

export const invitationsQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["org", orgId, "invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*, branches(name)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Invitation[];
    },
  });

export function invitationLink(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/auth?mode=signup&invite=${token}`;
}
