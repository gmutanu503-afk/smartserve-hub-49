import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type SubStatus = Database["public"]["Enums"]["subscription_status"];
type OrgStatus = Database["public"]["Enums"]["org_status"];

const SUB_STATUSES = ["TRIAL", "ACTIVE", "PAYMENT_DUE", "GRACE_PERIOD", "SUSPENDED", "CANCELLED"] as const;

/**
 * Platform-admin server functions.
 * Every handler: (1) verifies caller is a platform admin via RLS-safe RPC,
 * (2) performs the mutation as the caller (RLS still applies),
 * (3) writes an audit log row.
 */

type Ctx = { supabase: any; userId: string; claims: any };

async function assertPlatformAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin", { _user_id: ctx.userId });
  if (error || !data) throw new Error("Forbidden: platform admin access required");
  const { data: roles } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const roleList: string[] = (roles ?? []).map((r: { role: string }) => r.role);
  return roleList.includes("super_admin") ? "super_admin" : "platform_admin";
}

async function audit(
  ctx: Ctx,
  actorRole: string,
  action: string,
  target: { type: string; id: string; organizationId?: string | null },
  metadata: Record<string, unknown> = {},
) {
  await ctx.supabase.from("audit_logs").insert({
    actor_id: ctx.userId,
    actor_email: (ctx.claims as { email?: string } | undefined)?.email ?? null,
    actor_role: actorRole,
    action,
    target_type: target.type,
    target_id: target.id,
    organization_id: target.organizationId ?? null,
    metadata,
  });
}

function orgStatusForSub(status: SubStatus): OrgStatus {
  switch (status) {
    case "TRIAL":
      return "trial";
    case "SUSPENDED":
      return "suspended";
    case "CANCELLED":
      return "cancelled";
    default:
      return "active";
  }
}

export const setOrganizationSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ organizationId: z.string().uuid(), suspend: z.boolean(), reason: z.string().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await assertPlatformAdmin(ctx);
    const { supabase } = ctx;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, status, trial_ends_at")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let newSubStatus: SubStatus;
    if (data.suspend) newSubStatus = "SUSPENDED";
    else newSubStatus = sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date() ? "TRIAL" : "ACTIVE";

    const { error: orgErr } = await supabase
      .from("organizations")
      .update({ status: data.suspend ? "suspended" : orgStatusForSub(newSubStatus) })
      .eq("id", data.organizationId);
    if (orgErr) throw new Error(orgErr.message);

    if (sub) {
      const { error } = await supabase.from("subscriptions").update({ status: newSubStatus }).eq("id", sub.id);
      if (error) throw new Error(error.message);
    }

    await audit(ctx, role, data.suspend ? "organization.suspended" : "organization.reactivated", {
      type: "organization",
      id: data.organizationId,
      organizationId: data.organizationId,
    }, { reason: data.reason ?? null, previous_status: sub?.status ?? null });

    return { ok: true, status: newSubStatus };
  });

export const changeOrganizationPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ organizationId: z.string().uuid(), planId: z.string().uuid(), approveUpgrade: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await assertPlatformAdmin(ctx);
    const { supabase } = ctx;

    const { data: plan, error: planErr } = await supabase.from("plans").select("*").eq("id", data.planId).single();
    if (planErr || !plan) throw new Error("Plan not found");

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, plan_id, status")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      const { error } = await supabase.from("subscriptions").insert({
        organization_id: data.organizationId,
        plan_id: plan.id,
        status: "ACTIVE",
        price: plan.price_monthly,
        currency: plan.currency,
        renewal_at: new Date(Date.now() + 30 * 864e5).toISOString(),
        payment_status: "paid",
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_id: plan.id,
          price: plan.price_monthly,
          currency: plan.currency,
          pending_plan_id: null,
          status: sub.status === "TRIAL" ? "TRIAL" : sub.status,
        })
        .eq("id", sub.id);
      if (error) throw new Error(error.message);
    }

    await audit(ctx, role, data.approveUpgrade ? "subscription.upgrade_approved" : "subscription.plan_changed", {
      type: "subscription",
      id: sub?.id ?? data.organizationId,
      organizationId: data.organizationId,
    }, { from_plan_id: sub?.plan_id ?? null, to_plan_id: plan.id, to_plan: plan.code });

    return { ok: true };
  });

export const updateSubscriptionDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        organizationId: z.string().uuid(),
        trialEndsAt: z.string().datetime().optional(),
        renewalAt: z.string().datetime().optional(),
        status: z.enum(SUB_STATUSES).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await assertPlatformAdmin(ctx);
    const { supabase } = ctx;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, status, trial_ends_at, renewal_at")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) throw new Error("No subscription found for this organization");

    const patch: Record<string, unknown> = {};
    if (data.trialEndsAt) {
      patch.trial_ends_at = data.trialEndsAt;
      patch.renewal_at = data.trialEndsAt;
      if (sub.status === "TRIAL" || sub.status === "SUSPENDED") patch.status = "TRIAL";
    }
    if (data.renewalAt) patch.renewal_at = data.renewalAt;
    if (data.status) patch.status = data.status;

    const { error } = await supabase.from("subscriptions").update(patch).eq("id", sub.id);
    if (error) throw new Error(error.message);

    const finalStatus = (patch.status as SubStatus | undefined) ?? (sub.status as SubStatus);
    await supabase.from("organizations").update({ status: orgStatusForSub(finalStatus) }).eq("id", data.organizationId);

    const action = data.trialEndsAt ? "subscription.trial_extended" : data.status ? "subscription.status_changed" : "subscription.expiry_changed";
    await audit(ctx, role, action, { type: "subscription", id: sub.id, organizationId: data.organizationId }, {
      before: { status: sub.status, trial_ends_at: sub.trial_ends_at, renewal_at: sub.renewal_at },
      after: patch,
    });

    return { ok: true };
  });

export const setOrganizationFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ organizationId: z.string().uuid(), featureKey: z.string().min(1), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await assertPlatformAdmin(ctx);
    const { error } = await ctx.supabase.from("organization_features").upsert(
      {
        organization_id: data.organizationId,
        feature_key: data.featureKey,
        enabled: data.enabled,
        source: "override",
        updated_by: ctx.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,feature_key" },
    );
    if (error) throw new Error(error.message);

    await audit(ctx, role, data.enabled ? "feature.enabled" : "feature.disabled", {
      type: "organization_feature",
      id: data.featureKey,
      organizationId: data.organizationId,
    }, { feature_key: data.featureKey, enabled: data.enabled });

    return { ok: true };
  });

const orgInput = z.object({
  name: z.string().min(2).max(120),
  businessType: z.enum(["restaurant", "cafe", "bar", "hotel"]),
  ownerName: z.string().min(2).max(120),
  ownerEmail: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  country: z.string().max(4).optional(),
});

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orgInput.extend({ planId: z.string().uuid(), startAsTrial: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await assertPlatformAdmin(ctx);
    const { supabase } = ctx;

    const slug =
      data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 7);

    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        name: data.name,
        slug,
        business_type: data.businessType,
        owner_name: data.ownerName,
        owner_email: data.ownerEmail,
        phone: data.phone || null,
        country: data.country ?? "KE",
        status: data.startAsTrial ? "trial" : "active",
        last_activity_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !org) throw new Error(error?.message ?? "Failed to create organization");

    const { data: plan } = await supabase.from("plans").select("*").eq("id", data.planId).single();
    const trialEnd = new Date(Date.now() + 14 * 864e5).toISOString();
    const renewal = new Date(Date.now() + 30 * 864e5).toISOString();

    await supabase.from("branches").insert({ organization_id: org.id, name: "Main Branch" });
    const { error: subErr } = await supabase.from("subscriptions").insert({
      organization_id: org.id,
      plan_id: data.planId,
      status: data.startAsTrial ? "TRIAL" : "ACTIVE",
      price: data.startAsTrial ? 0 : (plan?.price_monthly ?? 0),
      currency: plan?.currency ?? "USD",
      trial_ends_at: data.startAsTrial ? trialEnd : null,
      renewal_at: data.startAsTrial ? trialEnd : renewal,
      payment_status: data.startAsTrial ? "none" : "paid",
    });
    if (subErr) throw new Error(subErr.message);

    await audit(ctx, role, "organization.created", { type: "organization", id: org.id, organizationId: org.id }, {
      name: data.name,
      plan_id: data.planId,
      trial: data.startAsTrial,
    });

    return { ok: true, organizationId: org.id as string };
  });

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orgInput.extend({ organizationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await assertPlatformAdmin(ctx);
    const { error } = await ctx.supabase
      .from("organizations")
      .update({
        name: data.name,
        business_type: data.businessType,
        owner_name: data.ownerName,
        owner_email: data.ownerEmail,
        phone: data.phone || null,
        country: data.country,
      })
      .eq("id", data.organizationId);
    if (error) throw new Error(error.message);

    await audit(ctx, role, "organization.updated", {
      type: "organization",
      id: data.organizationId,
      organizationId: data.organizationId,
    }, { name: data.name });
    return { ok: true };
  });

export const updatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        planId: z.string().uuid(),
        priceMonthly: z.number().min(0),
        userLimit: z.number().int().min(1),
        branchLimit: z.number().int().min(1),
        tableLimit: z.number().int().min(1),
        featureKeys: z.array(z.string()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await assertPlatformAdmin(ctx);
    if (role !== "super_admin") throw new Error("Only Super Admins can edit plans");
    const { supabase } = ctx;

    const { error } = await supabase
      .from("plans")
      .update({
        price_monthly: data.priceMonthly,
        user_limit: data.userLimit,
        branch_limit: data.branchLimit,
        table_limit: data.tableLimit,
      })
      .eq("id", data.planId);
    if (error) throw new Error(error.message);

    await supabase.from("plan_features").delete().eq("plan_id", data.planId);
    if (data.featureKeys.length) {
      const { error: pfErr } = await supabase
        .from("plan_features")
        .insert(data.featureKeys.map((feature_key) => ({ plan_id: data.planId, feature_key })));
      if (pfErr) throw new Error(pfErr.message);
    }

    await audit(ctx, role, "plan.updated", { type: "plan", id: data.planId }, { ...data });
    return { ok: true };
  });

export const setPlatformUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["super_admin", "platform_admin"]), grant: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const role = await assertPlatformAdmin(ctx);
    if (role !== "super_admin") throw new Error("Only Super Admins can manage platform roles");
    if (data.userId === ctx.userId && !data.grant) throw new Error("You cannot remove your own platform role");
    const { supabase } = ctx;

    if (data.grant) {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role, organization_id: null }, { onConflict: "user_id,role,organization_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role).is("organization_id", null);
      if (error) throw new Error(error.message);
    }

    await audit(ctx, role, data.grant ? "user.role_granted" : "user.role_revoked", { type: "user", id: data.userId }, { role: data.role });
    return { ok: true };
  });
