"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { GrowthLogRead } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface GrowthChartProps {
  data: GrowthLogRead[];
  loading?: boolean;
  metric: "weight" | "height";
  childDob?: string | null;
  title?: string;
}

const METRIC_CONFIG = {
  weight: {
    dataKey: "weight_kg" as const,
    label: "Weight",
    unit: "kg",
    stroke: "hsl(var(--primary))",
  },
  height: {
    dataKey: "height_cm" as const,
    label: "Height",
    unit: "cm",
    stroke: "hsl(var(--chart-2, 210 80% 50%))",
  },
};

const MS_IN_MONTH = 1000 * 60 * 60 * 24 * 30.4375;

const getAgeInMonths = (dob: string | null | undefined, recordDate: string): number | null => {
  if (!dob) return null;
  const dobDate = new Date(dob);
  const record = new Date(recordDate);
  if (Number.isNaN(dobDate.getTime()) || Number.isNaN(record.getTime())) return null;
  const diff = record.getTime() - dobDate.getTime();
  if (diff < 0) return 0;
  return diff / MS_IN_MONTH;
};

const getIdealRange = (
  metric: "weight" | "height",
  ageMonths: number | null,
  actualValue: number,
): { min: number; max: number } => {
  if (ageMonths == null) {
    return { min: Number((actualValue * 0.9).toFixed(2)), max: Number((actualValue * 1.1).toFixed(2)) };
  }
  if (metric === "weight") {
    // Approximation inspired by WHO percentile curves for infants
    const min = 3.0 + ageMonths * 0.4;
    const max = 4.2 + ageMonths * 0.55;
    return { min: Number(min.toFixed(2)), max: Number(max.toFixed(2)) };
  }
  const min = 48 + ageMonths * 1.25;
  const max = 52 + ageMonths * 1.5;
  return { min: Number(min.toFixed(1)), max: Number(max.toFixed(1)) };
};

export function GrowthChart({ data, loading, metric, childDob, title }: GrowthChartProps) {
  const config = METRIC_CONFIG[metric];

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading growth data...</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-lg border bg-muted/30 text-center">
        <p className="text-base font-medium">No growth logs yet</p>
        <p className="text-sm text-muted-foreground">Add weight and height entries to populate the chart.</p>
      </div>
    );
  }

  const chartData = data
    .slice()
    .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime())
    .map((entry) => ({
      ...entry,
      label: formatDate(entry.record_date, { month: "short", day: "numeric" }),
      value: entry[config.dataKey],
      ...getIdealRange(metric, getAgeInMonths(childDob, entry.record_date), entry[config.dataKey]),
    }));

  return (
    <div className="h-72 w-full">
      {title ? <p className="mb-2 text-sm font-semibold text-muted-foreground">{title}</p> : null}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
          <YAxis
            yAxisId={metric}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${value}${config.unit}`}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as (typeof chartData)[number];
              return (
                <div className="space-y-1 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold">{label}</p>
                  <p>
                    {config.label}: <span className="font-semibold">{point.value} {config.unit}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Ideal range: {point.min} – {point.max} {config.unit}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={config.stroke}
            strokeWidth={3}
            dot={{ r: 6, strokeWidth: 2, stroke: config.stroke, fill: "hsl(var(--accent))" }}
            activeDot={{ r: 8, fill: config.stroke }}
            yAxisId={metric}
          />
          <Line
            type="monotone"
            dataKey="min"
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="6 6"
            strokeWidth={1.5}
            yAxisId={metric}
          />
          <Line
            type="monotone"
            dataKey="max"
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="6 6"
            strokeWidth={1.5}
            yAxisId={metric}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
