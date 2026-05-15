import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,  Bar,
  LineChart, Line,
  PieChart,  Pie,  Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { recommendChart, prepareChartData, CHART_COLORS } from './chartUtils.js';

/**
 * AutoChart — automatically renders the best chart for query results.
 *
 * Props:
 *   columns  : string[]
 *   data     : Object[]
 *   height   : number (default 300)
 */
export default function AutoChart({ columns, data, height = 300 }) {
  const recommendation = useMemo(
    () => recommendChart(columns, data),
    [columns, data]
  );

  if (!recommendation) return null;

  const { chartType, labelKey, valueKeys, title } = recommendation;
  const chartData = useMemo(
    () => prepareChartData(data, labelKey, valueKeys),
    [data, labelKey, valueKeys]
  );

  /* ── Shared axis props ───────────────────────────────── */
  const xAxisProps = {
    dataKey: labelKey,
    tick: { fontSize: 12, fill: '#6b7280' },
    tickLine: false,
    axisLine: { stroke: '#e5e7eb' },
    interval: chartData.length > 12 ? Math.floor(chartData.length / 8) : 0,
    angle: chartData.length > 8 ? -30 : 0,
    textAnchor: chartData.length > 8 ? 'end' : 'middle',
    height: chartData.length > 8 ? 60 : 40,
  };

  const yAxisProps = {
    tick: { fontSize: 12, fill: '#6b7280' },
    tickLine: false,
    axisLine: { stroke: '#e5e7eb' },
    width: 65,
  };

  const tooltipStyle = {
    contentStyle: {
      background: '#1f2937',
      border: 'none',
      borderRadius: 8,
      color: '#f9fafb',
      fontSize: 13,
    },
    itemStyle: { color: '#d1d5db' },
  };

  /* ── Chart renderers ────────────────────────────────── */

  if (chartType === 'bar') {
    return (
      <div className="auto-chart">
        <div className="chart-title">{title}</div>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyle} />
            {valueKeys.length > 1 && <Legend />}
            {valueKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'line') {
    return (
      <div className="auto-chart">
        <div className="chart-title">{title}</div>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipStyle} />
            {valueKeys.length > 1 && <Legend />}
            {valueKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={600}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'pie') {
    const pieData = chartData.map(d => ({
      name: String(d[labelKey]),
      value: d[valueKeys[0]],
    }));

    return (
      <div className="auto-chart">
        <div className="chart-title">{title}</div>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={Math.min(height * 0.35, 110)}
              innerRadius={Math.min(height * 0.18, 50)}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ strokeWidth: 1 }}
              animationDuration={600}
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
