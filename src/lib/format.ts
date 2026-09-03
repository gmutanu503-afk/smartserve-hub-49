import { format, formatDistanceToNow, differenceInDays } from "date-fns";

export function formatMoney(value: number | string | null | undefined, currency = "USD") {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy");
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "d MMM yyyy, HH:mm");
}

export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return "Never";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function daysUntil(value: string | Date | null | undefined) {
  if (!value) return null;
  return differenceInDays(new Date(value), new Date());
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
