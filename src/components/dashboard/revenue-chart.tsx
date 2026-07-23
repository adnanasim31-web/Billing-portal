"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const DATA = [
  { month: "Feb", amount: 298000 },
  { month: "Mar", amount: 312000 },
  { month: "Apr", amount: 287000 },
  { month: "May", amount: 341000 },
  { month: "Jun", amount: 356000 },
  { month: "Jul", amount: 184200 },
];

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={DATA} barCategoryGap="28%">
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
