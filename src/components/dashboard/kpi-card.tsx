import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  caption: string;
  /** Omit when there's no historical baseline to compare against - no fabricated trend is shown. */
  changePercent?: number;
  /** true = an increase is good news (e.g. collections); false = a decrease is good news (e.g. denial rate) */
  increaseIsGood?: boolean;
  progress?: number;
}

export function KpiCard({
  label,
  value,
  caption,
  changePercent,
  increaseIsGood = true,
  progress,
}: KpiCardProps) {
  const isIncrease = (changePercent ?? 0) >= 0;
  const isGood = isIncrease === increaseIsGood;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          {changePercent !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                isGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}
            >
              {isIncrease ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(changePercent).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
        {progress !== undefined && <Progress value={progress} className="mt-3" />}
      </CardContent>
    </Card>
  );
}
