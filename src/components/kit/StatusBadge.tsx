import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type SubStatus = Database["public"]["Enums"]["subscription_status"];
type OrgStatus = Database["public"]["Enums"]["org_status"];
type PayStatus = Database["public"]["Enums"]["payment_status"];

const SUB_STATUS: Record<SubStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" | "gold" }> = {
  TRIAL: { label: "Trial", variant: "info" },
  ACTIVE: { label: "Active", variant: "success" },
  PAYMENT_DUE: { label: "Payment due", variant: "warning" },
  GRACE_PERIOD: { label: "Grace period", variant: "warning" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
};

const ORG_STATUS: Record<OrgStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" }> = {
  active: { label: "Active", variant: "success" },
  trial: { label: "Trial", variant: "info" },
  suspended: { label: "Suspended", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

const PAY_STATUS: Record<PayStatus, { label: string; variant: "success" | "warning" | "danger" | "muted" }> = {
  paid: { label: "Paid", variant: "success" },
  due: { label: "Due", variant: "warning" },
  failed: { label: "Failed", variant: "danger" },
  none: { label: "No payment", variant: "muted" },
};

export function SubscriptionStatusBadge({ status }: { status: SubStatus }) {
  const s = SUB_STATUS[status];
  return (
    <Badge variant={s.variant}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {s.label}
    </Badge>
  );
}

export function OrgStatusBadge({ status }: { status: OrgStatus }) {
  const s = ORG_STATUS[status];
  return (
    <Badge variant={s.variant}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {s.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PayStatus }) {
  const s = PAY_STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function PlanBadge({ code, name }: { code: string; name: string }) {
  const variant = code === "enterprise" ? "gold" : code === "pro" ? "default" : code === "growth" ? "info" : "secondary";
  return <Badge variant={variant}>{name}</Badge>;
}

export const SUBSCRIPTION_STATUSES = Object.keys(SUB_STATUS) as SubStatus[];
export const SUB_STATUS_LABELS = SUB_STATUS;
