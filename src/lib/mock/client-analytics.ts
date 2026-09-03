/**
 * Mock analytics for the Client Admin dashboard. Shapes match what future
 * aggregations over `orders`, `order_items` and `payments` will return.
 */

export interface DayPoint {
  day: string;
  revenue: number;
  orders: number;
}

export interface ProductSales {
  name: string;
  units: number;
  revenue: number;
  trend: number;
}

export interface PaymentSplit {
  name: string;
  value: number;
}

export type AlertSeverity = "critical" | "warning" | "positive" | "info";

export interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  metric: string;
  time: string;
}

export const revenueByDay: DayPoint[] = [
  { day: "Mon", revenue: 68400, orders: 182 },
  { day: "Tue", revenue: 61200, orders: 164 },
  { day: "Wed", revenue: 72900, orders: 191 },
  { day: "Thu", revenue: 79300, orders: 206 },
  { day: "Fri", revenue: 104800, orders: 268 },
  { day: "Sat", revenue: 128600, orders: 322 },
  { day: "Sun", revenue: 96500, orders: 247 },
];

export const paymentSplit: PaymentSplit[] = [
  { name: "M-Pesa", value: 58 },
  { name: "Card", value: 27 },
  { name: "Cash", value: 15 },
];

export const topProducts: ProductSales[] = [
  { name: "Nyama Choma Platter", units: 214, revenue: 342400, trend: 12.4 },
  { name: "Grilled Tilapia", units: 168, revenue: 235200, trend: 4.1 },
  { name: "Chicken Biryani", units: 151, revenue: 181200, trend: 38.7 },
  { name: "Tusker Lager", units: 402, revenue: 120600, trend: -2.3 },
  { name: "Passion Juice", units: 233, revenue: 69900, trend: 6.9 },
];

export const clientKpis = {
  todayRevenue: 84250,
  todayRevenueChange: -6.2,
  orders: 218,
  ordersChange: 3.4,
  avgOrderValue: 3865,
  aovChange: -1.8,
  grossProfit: 51390,
  grossMargin: 61,
  activeTables: 14,
  totalTables: 22,
};

export const smartAlerts: SmartAlert[] = [
  {
    id: "a1",
    severity: "critical",
    title: "Kitchen preparation time is above target",
    detail: "Average ticket time is 21 min vs. 15 min target at Westlands during lunch peak.",
    metric: "+40%",
    time: "12 min ago",
  },
  {
    id: "a2",
    severity: "warning",
    title: "Revenue is down compared with previous period",
    detail: "Today's revenue is tracking 6.2% below the same weekday last week.",
    metric: "-6.2%",
    time: "1 hr ago",
  },
  {
    id: "a3",
    severity: "positive",
    title: "Chicken Biryani is selling unusually well",
    detail: "Units sold are 38% above the 4-week average. Consider a featured placement.",
    metric: "+38%",
    time: "2 hrs ago",
  },
  {
    id: "a4",
    severity: "warning",
    title: "Food cost has increased",
    detail: "Beef cost per kg rose 9% this week, compressing margin on grill items.",
    metric: "+9%",
    time: "Yesterday",
  },
];
