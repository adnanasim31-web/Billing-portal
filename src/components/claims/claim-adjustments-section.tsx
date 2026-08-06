"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { CLAIM_ADJUSTMENT_CATEGORIES } from "@/lib/validations/claim-adjustments";
import type { ClaimAdjustmentCategory } from "@/types/database.types";

export const ADJUSTMENT_CATEGORY_LABELS: Record<ClaimAdjustmentCategory, string> = {
  write_off: "Write-off",
  contractual: "Contractual",
  financial_hardship: "Financial hardship",
  courtesy: "Courtesy",
  correction: "Correction",
  other: "Other",
};

export interface AdjustableLine {
  id: string;
  lineNumber: number;
  procedureCode: string;
  remainingBalance: number;
}

export interface ClaimAdjustmentRow {
  id: string;
  lineNumber: number;
  procedureCode: string;
  amount: number;
  category: ClaimAdjustmentCategory;
  notes: string | null;
  createdByName: string;
  createdAt: string;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function ClaimAdjustmentsSection({
  claimId,
  lines,
  adjustments,
  canManage,
}: {
  claimId: string;
  lines: AdjustableLine[];
  adjustments: ClaimAdjustmentRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const adjustableLines = lines.filter((line) => line.remainingBalance > 0);
  const [claimLineId, setClaimLineId] = React.useState(adjustableLines[0]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<ClaimAdjustmentCategory>("write_off");
  const [notes, setNotes] = React.useState("");

  const selectedLine = adjustableLines.find((line) => line.id === claimLineId);

  async function handleSubmit() {
    const numericAmount = Number(amount);
    if (!claimLineId || !numericAmount || numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimLineId, amount: numericAmount, category, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to post adjustment");
        return;
      }
      toast.success("Adjustment posted");
      setAmount("");
      setNotes("");
      setOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Adjustments</CardTitle>
        {canManage && adjustableLines.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Receipt className="h-4 w-4" />
                Post adjustment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post an adjustment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Procedure line</label>
                  <Select value={claimLineId} onValueChange={setClaimLineId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {adjustableLines.map((line) => (
                        <SelectItem key={line.id} value={line.id}>
                          Line {line.lineNumber} · {line.procedureCode} — {formatCurrency(line.remainingBalance)}{" "}
                          remaining
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedLine?.remainingBalance}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {selectedLine && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Up to {formatCurrency(selectedLine.remainingBalance)} remaining on this line
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ClaimAdjustmentCategory)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLAIM_ADJUSTMENT_CATEGORIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {ADJUSTMENT_CATEGORY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Timely filing denial, provider agreed to write off."
                    className="mt-1.5 flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!claimLineId || !amount || Number(amount) <= 0 || isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Post adjustment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {adjustments.length === 0 ? (
          <EmptyState icon={Receipt} title="No adjustments posted yet" />
        ) : (
          <ul className="divide-y divide-border">
            {adjustments.map((adjustment) => (
              <li key={adjustment.id} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Line {adjustment.lineNumber} · {adjustment.procedureCode}
                    </span>
                    <Badge variant="secondary">{ADJUSTMENT_CATEGORY_LABELS[adjustment.category]}</Badge>
                  </div>
                  {adjustment.notes && <p className="text-sm text-muted-foreground">{adjustment.notes}</p>}
                  <p className="text-xs text-muted-foreground">
                    {adjustment.createdByName} · {new Date(adjustment.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-medium">{formatCurrency(adjustment.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
