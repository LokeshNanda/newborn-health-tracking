"use client";

import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { GrowthLogRead } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface GrowthChartProps {
  data: GrowthLogRead[];
  loading?: boolean;
}

export function GrowthChart({ data, loading }: GrowthChartProps) {
  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading growth data…</p>
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
    }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
          <YAxis
            yAxisId="weight"
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${value}kg`}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
            formatter={(value: number) => [`${value} kg`, "Weight"]}
            labelFormatter={(value) => `Recorded on ${value}`}
          />
          <Line
            type="monotone"
            dataKey="weight_kg"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 6, strokeWidth: 2, stroke: "#1d4ed8", fill: "#bfdbfe" }}
            activeDot={{ r: 8 }}
            yAxisId="weight"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
