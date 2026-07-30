"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export interface ClaimStatusDatum {
  name: string;
  value: number;
  color: string;
}

export function ClaimStatusDonut({ data }: { data: ClaimStatusDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <EmptyState icon={ReceiptText} title="No claims yet" description="Claim status mix will appear here once claims are submitted." />;
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={3} stroke="none">
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold">{total}</span>
          <span className="text-[11px] text-muted-foreground">claims</span>
        </div>
      </div>

      <ul className="space-y-2.5">
        {data.map((entry) => (
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
