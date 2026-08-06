import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getPaymentById } from "@/lib/services/payment-service";
import { listRefundsForPayment } from "@/lib/services/payment-refund-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_METHOD_LABELS } from "@/components/payments/payments-table";
import { PaymentAllocationSection } from "@/components/payments/payment-allocation-section";
import { PaymentRefundSection } from "@/components/payments/payment-refund-section";

export const metadata: Metadata = { title: "Payment" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const [detail, refunds] = await Promise.all([
    getPaymentById(id, user.organizationId),
    listRefundsForPayment(id, user.organizationId),
  ]);
  if (!detail) notFound();

  const { payment, lines, allocations, patient } = detail;
  const canPost = hasPermission(user, PERMISSIONS.PAYMENTS_POST);

  const refundedByAllocation = new Map<string, number>();
  for (const refund of refunds) {
    refundedByAllocation.set(
      refund.payment_allocation_id,
      (refundedByAllocation.get(refund.payment_allocation_id) ?? 0) + Number(refund.amount)
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{payment.payer_name}</h2>
        <p className="text-sm text-muted-foreground">
          {new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString()} ·{" "}
          {PAYMENT_METHOD_LABELS[payment.payment_method]}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field
            label="Claim"
            value={
              payment.claims ? (
                <Link href={`/claims/${payment.claims.id}`} className="hover:underline">
                  {payment.claims.claim_number}
                </Link>
              ) : (
                "Unknown claim"
              )
            }
          />
          <Field
            label="Patient"
            value={
              patient ? (
                <Link href={`/patients/${patient.id}`} className="hover:underline">
                  {patient.first_name} {patient.last_name} ({patient.mrn})
                </Link>
              ) : (
                "Unknown patient"
              )
            }
          />
          <Field label="Total amount" value={formatCurrency(Number(payment.total_amount))} />
          <Field label="Reference number" value={payment.reference_number} />
          {payment.notes && <Field label="Notes" value={payment.notes} />}
        </CardContent>
      </Card>

      <PaymentAllocationSection
        paymentId={payment.id}
        totalAmount={Number(payment.total_amount)}
        lines={lines.map((l) => ({
          id: l.id,
          lineNumber: l.line_number,
          procedureCode: l.procedure_code,
          description: l.procedure_codes?.description ?? "",
          chargeAmount: Number(l.charge_amount),
          paidAmount: Number(l.paid_amount),
          adjustmentAmount: Number(l.adjustment_amount),
        }))}
        allocations={allocations.map((a) => ({
          id: a.id,
          lineNumber: a.claim_lines?.line_number ?? 0,
          procedureCode: a.claim_lines?.procedure_code ?? "",
          paidAmount: Number(a.paid_amount),
          adjustmentAmount: Number(a.adjustment_amount),
          adjustmentReason: a.adjustment_reason,
          createdAt: a.created_at,
        }))}
        canPost={canPost}
      />

      <PaymentRefundSection
        paymentId={payment.id}
        allocations={allocations.map((a) => ({
          id: a.id,
          lineNumber: a.claim_lines?.line_number ?? 0,
          procedureCode: a.claim_lines?.procedure_code ?? "",
          refundableAmount: Math.max(0, Number(a.paid_amount) - (refundedByAllocation.get(a.id) ?? 0)),
        }))}
        refunds={refunds.map((r) => ({
          id: r.id,
          lineNumber: r.claim_lines?.line_number ?? 0,
          procedureCode: r.claim_lines?.procedure_code ?? "",
          amount: Number(r.amount),
          reason: r.reason,
          notes: r.notes,
          createdByName: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : "Unknown",
          createdAt: r.created_at,
          stripeRefundId: r.stripe_refund_id,
        }))}
        canManage={canPost}
      />
    </div>
  );
}
