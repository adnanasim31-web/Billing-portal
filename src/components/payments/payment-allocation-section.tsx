"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ClipboardList } from "lucide-react";

export interface PaymentClaimLineRow {
  id: string;
  lineNumber: number;
  procedureCode: string;
  description: string;
  chargeAmount: number;
  paidAmount: number;
  adjustmentAmount: number;
}

export interface PaymentAllocationRow {
  id: string;
  lineNumber: number;
  procedureCode: string;
  paidAmount: number;
  adjustmentAmount: number;
  adjustmentReason: string | null;
  createdAt: string;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function PaymentAllocationSection({
  paymentId,
  totalAmount,
  lines,
  allocations,
  canPost,
}: {
  paymentId: string;
  totalAmount: number;
  lines: PaymentClaimLineRow[];
  allocations: PaymentAllocationRow[];
  canPost: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [claimLineId, setClaimLineId] = React.useState("");
  const [paidAmount, setPaidAmount] = React.useState("");
  const [adjustmentAmount, setAdjustmentAmount] = React.useState("0");
  const [adjustmentReason, setAdjustmentReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const appliedFromThisPayment = allocations.reduce((sum, a) => sum + a.paidAmount, 0);
  const unappliedAmount = totalAmount - appliedFromThisPayment;

  function resetForm() {
    setClaimLineId("");
    setPaidAmount("");
    setAdjustmentAmount("0");
    setAdjustmentReason("");
  }

  async function handleAllocate() {
    if (!claimLineId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimLineId,
          paidAmount: Number(paidAmount) || 0,
          adjustmentAmount: Number(adjustmentAmount) || 0,
          adjustmentReason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to allocate payment");
        return;
      }
      toast.success("Payment allocated");
      setIsOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Unapplied balance</CardTitle>
          {canPost && (
            <Dialog
              open={isOpen}
              onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                  Allocate to a line
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Allocate payment</DialogTitle>
                  <DialogDescription>Apply paid and/or adjustment amounts to a procedure line.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Procedure line</Label>
                    <Select value={claimLineId} onValueChange={setClaimLineId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a line..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lines.map((line) => (
                          <SelectItem key={line.id} value={line.id}>
                            #{line.lineNumber} {line.procedureCode} - {formatCurrency(line.chargeAmount)} charged
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Paid amount</Label>
                      <Input type="number" min={0} step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Adjustment amount</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Adjustment reason (optional)</Label>
                    <Input
                      placeholder="e.g. CO-45 Contractual obligation"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAllocate} disabled={!claimLineId || isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Allocate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">{formatCurrency(unappliedAmount)}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(appliedFromThisPayment)} of {formatCurrency(totalAmount)} allocated to procedure lines
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claim procedure lines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {lines.map((line) => {
              const balance = line.chargeAmount - line.paidAmount - line.adjustmentAmount;
              return (
                <li key={line.id} className="flex items-center justify-between gap-4 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      #{line.lineNumber} {line.procedureCode}
                    </p>
                    <p className="text-xs text-muted-foreground">{line.description}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{formatCurrency(line.chargeAmount)} charged</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(line.paidAmount)} paid · {formatCurrency(line.adjustmentAmount)} adjusted ·{" "}
                      {formatCurrency(balance)} balance
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocations from this payment</CardTitle>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Not yet allocated" description="Apply this payment to a procedure line." />
          ) : (
            <ul className="divide-y divide-border">
              {allocations.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      #{a.lineNumber} {a.procedureCode}
                    </p>
                    {a.adjustmentReason && <p className="text-xs text-muted-foreground">{a.adjustmentReason}</p>}
                  </div>
                  <p className="text-sm">
                    {formatCurrency(a.paidAmount)} paid
                    {a.adjustmentAmount > 0 ? ` · ${formatCurrency(a.adjustmentAmount)} adjusted` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
