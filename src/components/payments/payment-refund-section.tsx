"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
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
import { PAYMENT_REFUND_REASONS } from "@/lib/validations/payment-refunds";
import type { PaymentRefundReason } from "@/types/database.types";

export const REFUND_REASON_LABELS: Record<PaymentRefundReason, string> = {
  overpayment: "Overpayment",
  coding_error: "Coding error",
  patient_dispute: "Patient dispute",
  insurance_recoupment: "Insurance recoupment",
  duplicate_payment: "Duplicate payment",
  other: "Other",
};

export interface RefundableAllocationRow {
  id: string;
  lineNumber: number;
  procedureCode: string;
  refundableAmount: number;
}

export interface PaymentRefundRow {
  id: string;
  lineNumber: number;
  procedureCode: string;
  amount: number;
  reason: PaymentRefundReason;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  stripeRefundId: string | null;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function PaymentRefundSection({
  paymentId,
  allocations,
  refunds,
  canManage,
}: {
  paymentId: string;
  allocations: RefundableAllocationRow[];
  refunds: PaymentRefundRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const refundableAllocations = allocations.filter((a) => a.refundableAmount > 0);
  const [paymentAllocationId, setPaymentAllocationId] = React.useState(refundableAllocations[0]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState<PaymentRefundReason>("overpayment");
  const [notes, setNotes] = React.useState("");

  const selectedAllocation = refundableAllocations.find((a) => a.id === paymentAllocationId);

  function resetForm() {
    setAmount("");
    setNotes("");
    setReason("overpayment");
  }

  async function handleSubmit() {
    const numericAmount = Number(amount);
    if (!paymentAllocationId || !numericAmount || numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/refunds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentAllocationId, amount: numericAmount, reason, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to issue refund");
        return;
      }
      toast.success("Refund issued");
      resetForm();
      setOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Refunds</CardTitle>
        {canManage && refundableAllocations.length > 0 && (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <RotateCcw className="h-4 w-4" />
                Issue refund
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue a refund</DialogTitle>
                <DialogDescription>
                  Reverses a paid amount from this payment. For a patient-portal card payment, this also refunds the
                  charge through Stripe.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Allocation</Label>
                  <Select value={paymentAllocationId} onValueChange={setPaymentAllocationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an allocation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {refundableAllocations.map((allocation) => (
                        <SelectItem key={allocation.id} value={allocation.id}>
                          Line {allocation.lineNumber} · {allocation.procedureCode} —{" "}
                          {formatCurrency(allocation.refundableAmount)} refundable
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedAllocation?.refundableAmount}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {selectedAllocation && (
                    <p className="text-xs text-muted-foreground">
                      Up to {formatCurrency(selectedAllocation.refundableAmount)} refundable
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select value={reason} onValueChange={(v) => setReason(v as PaymentRefundReason)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_REFUND_REASONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {REFUND_REASON_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Input placeholder="e.g. Patient overpaid at checkout" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!paymentAllocationId || !amount || Number(amount) <= 0 || isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Issue refund
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {refunds.length === 0 ? (
          <EmptyState icon={RotateCcw} title="No refunds issued yet" />
        ) : (
          <ul className="divide-y divide-border">
            {refunds.map((refund) => (
              <li key={refund.id} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-sm font-medium">
                    Line {refund.lineNumber} · {refund.procedureCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {REFUND_REASON_LABELS[refund.reason]}
                    {refund.stripeRefundId ? " · Refunded via Stripe" : ""} · {refund.createdByName} ·{" "}
                    {new Date(refund.createdAt).toLocaleString()}
                  </p>
                  {refund.notes && <p className="text-xs text-muted-foreground">{refund.notes}</p>}
                </div>
                <span className="text-sm font-medium">{formatCurrency(refund.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
