import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-elevated)",
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  background: "var(--card)",
  color: "var(--foreground)",
};

const axisProps = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

interface SeriesDef {
  key: string;
  name: string;
  color?: string;
}

export function TrendAreaChart({
  data,
  xKey,
  series,
  height = 260,
  formatter,
}: {
  data: object[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
  formatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatter} width={64} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => (formatter ? formatter(Number(v)) : v)} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? CHART_COLORS[i]}
            strokeWidth={2.2}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
  xKey,
  series,
  height = 260,
  formatter,
}: {
  data: object[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
  formatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatter} width={64} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => (formatter ? formatter(Number(v)) : v)} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? CHART_COLORS[i]}
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({
  data,
  xKey,
  series,
  height = 260,
  formatter,
  layout = "horizontal",
  stacked,
}: {
  data: object[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
  formatter?: (v: number) => string;
  layout?: "horizontal" | "vertical";
  stacked?: boolean;
}) {
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={vertical ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 8, left: vertical ? 8 : -12, bottom: 0 }}
        barCategoryGap={vertical ? 6 : 14}
      >
        <CartesianGrid vertical={vertical} horizontal={!vertical} stroke="var(--border)" strokeDasharray="3 3" />
        {vertical ? (
          <>
            <XAxis type="number" {...axisProps} tickFormatter={formatter} />
            <YAxis type="category" dataKey={xKey} {...axisProps} width={96} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axisProps} />
            <YAxis {...axisProps} tickFormatter={formatter} width={64} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "var(--secondary)" }}
          contentStyle={tooltipStyle}
          formatter={(v) => (formatter ? formatter(Number(v)) : v)}
        />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color ?? CHART_COLORS[i]}
            radius={vertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            stackId={stacked ? "stack" : undefined}
            maxBarSize={vertical ? 18 : 36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
  formatter,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number }[];
  height?: number;
  formatter?: (v: number) => string;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={3}
            cornerRadius={4}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => (formatter ? formatter(Number(v)) : v)} />
          <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
          <div className="font-display text-2xl font-bold">{centerValue}</div>
          {centerLabel && <div className="text-xs text-muted-foreground">{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}
