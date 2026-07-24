"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const DATA = [
  { name: "Paid", value: 156, color: "#0E9F6E" },
  { name: "Pending", value: 43, color: "#B7791F" },
  { name: "Denied", value: 28, color: "#D5433C" },
  { name: "In Review", value: 14, color: "#14B8A6" },
];

const TOTAL = DATA.reduce((sum, d) => sum + d.value, 0);

export function ClaimStatusDonut() {
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={DATA} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={3} stroke="none">
              {DATA.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold">{TOTAL}</span>
          <span className="text-[11px] text-muted-foreground">claims</span>
        </div>
      </div>

      <ul className="space-y-2.5">
        {DATA.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="w-20 text-muted-foreground">{entry.name}</span>
            <span className="font-medium">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
