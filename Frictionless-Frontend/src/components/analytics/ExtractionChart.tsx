'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';

interface ChartSeries {
  name: string;
  data: Array<{ x: string; y: number }>;
}

interface ExtractionChartConfig {
  chart_type: string;
  chart_title: string;
  chart_id?: string;
  series: ChartSeries[];
  unit?: string;
  x_axis_label?: string | null;
  y_axis_label?: string | null;
  insight?: string;
  categories?: string[];
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];

function formatValue(value: number, unit?: string): string {
  if (unit === 'USD' || unit === 'Billion USD') {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }
  if (unit === '%') return `${value}%`;
  return value.toLocaleString();
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: Record<string, unknown> & { unit?: string }) {
  if (!active || !payload || !(payload as Array<Record<string, unknown>>).length) return null;
  const items = payload as Array<{ value: number; name: string; color: string }>;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label as string}</p>
      {items.map((item, i) => (
        <p key={i} className="font-mono font-semibold" style={{ color: item.color }}>
          {item.name}: {formatValue(item.value, unit as string)}
        </p>
      ))}
    </div>
  );
}

/** Shorten long X-axis labels for better chart readability */
function truncateLabel(label: string, maxLen = 12): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 1) + '…';
}

export function ExtractionChart({ chart, index = 0 }: { chart: ExtractionChartConfig; index?: number }) {
  const unit = chart.unit;
  const series = chart.series ?? [];

  // Convert to recharts format for bar/line
  let rechartsData: Array<Record<string, string | number>> = [];
  if (series.length === 1 && series[0]?.data) {
    rechartsData = series[0].data.map((d) => ({
      x: d.x,
      [series[0].name]: d.y,
    }));
  } else if (series.length > 1) {
    const byX: Record<string, Record<string, string | number>> = {};
    const order = chart.categories ?? [];
    series.forEach((s) => {
      s.data?.forEach((d) => {
        if (!byX[d.x]) byX[d.x] = { x: d.x };
        byX[d.x][s.name] = d.y;
      });
    });
    series.forEach((s) => {
      Object.values(byX).forEach((row) => {
        if (row[s.name] === undefined) row[s.name] = 0;
      });
    });
    rechartsData = Object.values(byX).sort(
      (a, b) => (order.indexOf(String(a.x)) ?? 0) - (order.indexOf(String(b.x)) ?? 0)
    );
  }

  // Determine if X-axis labels are long and need angled display
  const hasLongLabels = rechartsData.some((d) => String(d.x).length > 10);
  const xAxisAngle = hasLongLabels ? -30 : 0;
  const bottomMargin = hasLongLabels ? 50 : 20;

  if (chart.chart_type === 'pie') {
    const pieData = (series[0]?.data ?? []).map((d, i) => ({
      name: d.x,
      value: d.y,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        className="rounded-2xl border border-border/50 bg-card p-5"
      >
        <h3 className="text-sm font-display font-semibold text-foreground mb-4">{chart.chart_title}</h3>
        <div className="w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                outerRadius="70%"
                innerRadius="30%"
                label={({ name, percent }) => `${truncateLabel(name ?? '', 16)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                dataKey="value"
                isAnimationActive
                animationDuration={1000}
                paddingAngle={2}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={(props: Record<string, unknown>) => <ChartTooltip {...props} unit={unit} />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {chart.insight && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border/40 pt-2">
            {chart.insight}
          </p>
        )}
      </motion.div>
    );
  }

  if (chart.chart_type === 'line') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        className="rounded-2xl border border-border/50 bg-card p-5"
      >
        <h3 className="text-sm font-display font-semibold text-foreground mb-4">{chart.chart_title}</h3>
        {chart.x_axis_label && <p className="text-[10px] text-muted-foreground mb-1">{chart.x_axis_label}</p>}
        <div className="w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rechartsData} margin={{ top: 8, right: 16, bottom: bottomMargin, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.15)" />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                angle={xAxisAngle}
                textAnchor={hasLongLabels ? 'end' : 'middle'}
                height={hasLongLabels ? 60 : 30}
                tickFormatter={(v: string) => truncateLabel(v)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                width={55}
                tickFormatter={(v: number) =>
                  unit === 'USD' ? `$${v >= 1e6 ? v / 1e6 + 'M' : v >= 1e3 ? v / 1e3 + 'K' : v}` : String(v)
                }
              />
              <Tooltip content={(props: Record<string, unknown>) => <ChartTooltip {...props} unit={unit} />} />
              {series.length > 1 && <Legend />}
              {series.map((s, i) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                  isAnimationActive
                  animationDuration={1000}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {chart.insight && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border/40 pt-2">
            {chart.insight}
          </p>
        )}
      </motion.div>
    );
  }

  // bar (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-2xl border border-border/50 bg-card p-5"
    >
      <h3 className="text-sm font-display font-semibold text-foreground mb-4">{chart.chart_title}</h3>
      {chart.x_axis_label && <p className="text-[10px] text-muted-foreground mb-1">{chart.x_axis_label}</p>}
      <div className="w-full" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rechartsData} margin={{ top: 8, right: 16, bottom: bottomMargin, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.15)" />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              angle={xAxisAngle}
              textAnchor={hasLongLabels ? 'end' : 'middle'}
              height={hasLongLabels ? 60 : 30}
              tickFormatter={(v: string) => truncateLabel(v)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={55}
              tickFormatter={(v: number) =>
                unit === 'USD' ? `$${v >= 1e6 ? v / 1e6 + 'M' : v >= 1e3 ? v / 1e3 + 'K' : v}` : String(v)
              }
            />
            <Tooltip content={(props: Record<string, unknown>) => <ChartTooltip {...props} unit={unit} />} />
            {series.length > 1 && <Legend />}
            {series.map((s, i) => (
              <Bar
                key={s.name}
                dataKey={s.name}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={1000}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {chart.insight && (
        <p className="text-xs text-muted-foreground mt-2 border-t border-border/40 pt-2">
          {chart.insight}
        </p>
      )}
    </motion.div>
  );
}
