/**
 * Mock platform analytics for the Super Admin Control Center.
 * Each series mirrors the shape a future server function would return from
 * aggregated `subscriptions`, `organizations` and `payments` data.
 */

export interface TimePoint {
  label: string;
  value: number;
}

export interface GrowthPoint {
  month: string;
  clients: number;
  newClients: number;
  cancelled: number;
}

export interface RevenuePoint {
  month: string;
  mrr: number;
  revenue: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export const clientGrowth: GrowthPoint[] = [
  { month: "Oct", clients: 42, newClients: 6, cancelled: 1 },
  { month: "Nov", clients: 49, newClients: 8, cancelled: 1 },
  { month: "Dec", clients: 58, newClients: 11, cancelled: 2 },
  { month: "Jan", clients: 66, newClients: 10, cancelled: 2 },
  { month: "Feb", clients: 73, newClients: 9, cancelled: 2 },
  { month: "Mar", clients: 84, newClients: 13, cancelled: 2 },
  { month: "Apr", clients: 92, newClients: 10, cancelled: 2 },
  { month: "May", clients: 103, newClients: 14, cancelled: 3 },
  { month: "Jun", clients: 111, newClients: 11, cancelled: 3 },
  { month: "Jul", clients: 124, newClients: 16, cancelled: 3 },
  { month: "Aug", clients: 133, newClients: 12, cancelled: 3 },
  { month: "Sep", clients: 142, newClients: 12, cancelled: 3 },
];

export const revenueTrend: RevenuePoint[] = [
  { month: "Oct", mrr: 4120, revenue: 4380 },
  { month: "Nov", mrr: 4790, revenue: 5010 },
  { month: "Dec", mrr: 5650, revenue: 6120 },
  { month: "Jan", mrr: 6420, revenue: 6700 },
  { month: "Feb", mrr: 7110, revenue: 7350 },
  { month: "Mar", mrr: 8230, revenue: 8690 },
  { month: "Apr", mrr: 9010, revenue: 9320 },
  { month: "May", mrr: 10120, revenue: 10680 },
  { month: "Jun", mrr: 10890, revenue: 11240 },
  { month: "Jul", mrr: 12240, revenue: 12910 },
  { month: "Aug", mrr: 13080, revenue: 13520 },
  { month: "Sep", mrr: 14060, revenue: 14410 },
];

export const clientsByPlan: NamedValue[] = [
  { name: "Starter", value: 61 },
  { name: "Growth", value: 48 },
  { name: "Pro", value: 26 },
  { name: "Enterprise", value: 7 },
];

export const clientsByStatus: NamedValue[] = [
  { name: "Active", value: 118 },
  { name: "Trial", value: 15 },
  { name: "Suspended", value: 9 },
];

export const featureUsage: NamedValue[] = [
  { name: "QR Menu", value: 128 },
  { name: "Analytics", value: 121 },
  { name: "Waiter Mode", value: 84 },
  { name: "M-Pesa", value: 79 },
  { name: "KDS", value: 66 },
  { name: "Multi-Branch", value: 41 },
  { name: "Inventory", value: 33 },
  { name: "Adv. Reports", value: 27 },
  { name: "AI Insights", value: 12 },
];

export const platformKpis = {
  totalClients: 142,
  activeClients: 118,
  trialClients: 15,
  suspendedClients: 9,
  mrr: 14060,
  newClientsThisMonth: 12,
  expiringSubscriptions: 7,
  failedPayments: 4,
  mrrChange: 7.5,
  clientsChange: 6.8,
};
