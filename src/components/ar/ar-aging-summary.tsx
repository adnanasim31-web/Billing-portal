import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgingBucket, AgingSummary } from "@/lib/services/ar-aging";

const BUCKET_LABELS: Record<AgingBucket, string> = {
  "0_30": "0-30 days",
  "31_60": "31-60 days",
  "61_90": "61-90 days",
  "91_120": "91-120 days",
  over_120: "120+ days",
};

const BUCKET_ORDER: AgingBucket[] = ["0_30", "31_60", "61_90", "91_120", "over_120"];

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function ArAgingSummary({ summary }: { summary: AgingSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {BUCKET_ORDER.map((bucket) => (
        <Card key={bucket}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {BUCKET_LABELS[bucket]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tracking-tight">{formatCurrency(summary[bucket].totalBalance)}</p>
            <p className="text-xs text-muted-foreground">
              {summary[bucket].count} claim{summary[bucket].count === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { BUCKET_LABELS as AGING_BUCKET_LABELS };
