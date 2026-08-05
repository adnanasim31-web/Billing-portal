import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentPortalUser, getPortalPaymentReceipt } from "@/lib/services/patient-portal-service";
import { PortalReceiptPrintButton } from "@/components/portal/portal-receipt-print-button";
import { PAYMENT_METHOD_LABELS } from "@/components/payments/payments-table";

export const metadata: Metadata = { title: "Payment Receipt" };

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function resolveProviderName(
  provider: { provider_type: string; first_name: string | null; last_name: string | null; organization_name: string | null } | null
): string {
  if (!provider) return "Unknown provider";
  return provider.provider_type === "organization"
    ? (provider.organization_name ?? "Unknown provider")
    : `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();
}

function formatAddress(entity: {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
}): string[] {
  const lines: string[] = [];
  if (entity.address_line1) lines.push(entity.address_line1);
  if (entity.address_line2) lines.push(entity.address_line2);
  const cityStateZip = [entity.city, [entity.state, entity.postal_code].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) lines.push(cityStateZip);
  return lines;
}

export default async function PortalPaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) redirect("/portal/login");

  const { id } = await params;
  const receipt = await getPortalPaymentReceipt(id, portalUser.patientId, portalUser.organizationId);
  if (!receipt) notFound();

  const { payment, claim, organization, patient, allocations } = receipt;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/portal/payments"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to payment history
        </Link>
        <PortalReceiptPrintButton />
      </div>

      <div className="rounded-lg border border-border bg-card p-8 print:border-none print:p-0">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{organization?.name ?? "MedBill RCM Suite"}</h1>
            {organization &&
              formatAddress(organization).map((line) => (
                <p key={line} className="text-sm text-muted-foreground">
                  {line}
                </p>
              ))}
            {organization?.phone && <p className="text-sm text-muted-foreground">{organization.phone}</p>}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xl font-semibold tracking-tight">Payment receipt</p>
            <p className="text-sm text-muted-foreground">
              {new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString()}
            </p>
            {payment.reference_number && (
              <p className="text-sm text-muted-foreground">Ref #{payment.reference_number}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billed to</p>
            <p className="mt-1 text-sm font-medium">
              {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
            </p>
            {patient &&
              formatAddress(patient).map((line) => (
                <p key={line} className="text-sm text-muted-foreground">
                  {line}
                </p>
              ))}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Statement</p>
            <p className="mt-1 text-sm font-medium">{claim.claim_number}</p>
            <p className="text-sm text-muted-foreground">{resolveProviderName(claim.providers)}</p>
            <p className="text-sm text-muted-foreground">
              Service: {new Date(`${claim.service_date_from}T00:00:00`).toLocaleDateString()} -{" "}
              {new Date(`${claim.service_date_to}T00:00:00`).toLocaleDateString()}
            </p>
          </div>
        </div>

        {allocations.length > 0 && (
          <table className="w-full border-t border-border text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Code</th>
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allocations.map((allocation) => (
                <tr key={allocation.id}>
                  <td className="py-2">{allocation.line?.procedure_codes?.code ?? "-"}</td>
                  <td className="py-2">{allocation.line?.procedure_codes?.description ?? "-"}</td>
                  <td className="py-2 text-right">{currencyFormatter.format(Number(allocation.paid_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 space-y-2 border-t border-border pt-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment method</span>
            <span>{PAYMENT_METHOD_LABELS[payment.payment_method]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Paid by</span>
            <span>{payment.payer_name}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total paid</span>
            <span>{currencyFormatter.format(Number(payment.total_amount))}</span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">Thank you for your payment.</p>
      </div>
    </div>
  );
}
