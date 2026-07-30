"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface RevenueChartDatum {
  month: string;
  amount: number;
}

export function RevenueChart({ data }: { data: RevenueChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="28%">
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "hsl(var(--secondary))" }}
          contentStyle={{
            borderRadius: 10,
            border: "1px solid hsl(var(--border))",
            fontSize: 12,
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Billed"]}
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
