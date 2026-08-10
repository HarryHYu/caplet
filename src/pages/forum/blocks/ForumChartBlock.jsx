import {
  LineChart, BarChart, ScatterChart,
  Line, Bar, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// Forum tokens first (cohesive with the rest of the section), a couple of
// neutral extras for series beyond four — same pattern SlideRenderer.jsx
// already uses for lesson charts.
const CHART_COLORS = ['var(--forum-accent)', 'var(--forum-blue)', 'var(--forum-green)', 'var(--forum-amber)', '#8b5cf6', '#06b6d4'];

/** Live, interactive charts a user defines from their own data (Recharts — already a project dependency). */
export default function ForumChartBlock({ data }) {
  const { chartType, title, xLabel, yLabel, labels = [], series = [] } = data || {};
  if (!series.length) return null;

  const rows = labels.length >= Math.max(...series.map((s) => s.data.length), 0)
    ? labels.map((label, i) => {
      const row = { label };
      series.forEach((s) => { row[s.name] = s.data[i]; });
      return row;
    })
    : series[0].data.map((_, i) => {
      const row = { label: labels[i] ?? `#${i + 1}` };
      series.forEach((s) => { row[s.name] = s.data[i]; });
      return row;
    });

  const axisStyle = { fontSize: 12, fill: 'var(--text-dim)' };
  const tooltipStyle = { background: 'var(--surface-raised)', border: '1px solid var(--line-soft)', borderRadius: 12, fontSize: 13 };

  let chart;
  if (chartType === 'scatter') {
    chart = (
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
        <XAxis dataKey="label" name={xLabel || 'X'} tick={axisStyle} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 12 } : undefined} />
        <YAxis name={yLabel || 'Y'} tick={axisStyle} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12 } : undefined} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Scatter key={s.name} name={s.name} data={s.data.map((y, idx) => ({ label: labels[idx] ?? idx, [s.name]: y }))} dataKey={s.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
        ))}
      </ScatterChart>
    );
  } else {
    const ChartComp = chartType === 'bar' ? BarChart : LineChart;
    const DataComp = chartType === 'bar' ? Bar : Line;
    chart = (
      <ChartComp data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
        <XAxis dataKey="label" tick={axisStyle} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 12 } : undefined} />
        <YAxis tick={axisStyle} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12 } : undefined} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <DataComp key={s.name} type="monotone" dataKey={s.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} dot={{ r: 3 }} />
        ))}
      </ChartComp>
    );
  }

  return (
    <div className="forum-card p-4">
      {title && <p className="mb-3 text-sm font-bold text-text-primary">{title}</p>}
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
