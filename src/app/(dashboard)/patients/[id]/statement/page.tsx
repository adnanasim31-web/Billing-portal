import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { computeStatementTotals, getPatientStatementData } from "@/lib/services/patient-statement-service";
import { CLAIM_STATUS_LABELS, CLAIM_STATUS_VARIANT } from "@/components/claims/claims-table";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/shared/print-button";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { formatAddressLines } from "@/lib/utils";

export const metadata: Metadata = { title: "Patient Statement" };

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function resolveProviderName(
  provider: { provider_type: string; first_name: string | null; last_name: string | null; organization_name: string | null } | null
): string {
  if (!provider) return "Unknown provider";
  return provider.provider_type === "organization"
    ? (provider.organization_name ?? "Unknown provider")
    : `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();
}

export default async function PatientStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PATIENTS_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const { patient, claims, organization } = await getPatientStatementData(id, user.organizationId);
  if (!patient) notFound();

  const totals = computeStatementTotals(
    claims.map((c) => ({
      totalChargeAmount: Number(c.total_charge_amount),
      totalPaidAmount: Number(c.total_paid_amount),
      totalAdjustmentAmount: Number(c.total_adjustment_amount),
      balanceAmount: Number(c.balance_amount),
    }))
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/patients/${id}`}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to patient profile
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-lg border border-border bg-card p-8 print:border-none print:p-0">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{organization?.name ?? "MedBill RCM Suite"}</h1>
            {organization &&
              formatAddressLines(organization).map((line) => (
                <p key={line} className="text-sm text-muted-foreground">
                  {line}
                </p>
              ))}
            {organization?.phone && <p className="text-sm text-muted-foreground">{organization.phone}</p>}
            {organization?.billing_email && (
              <p className="text-sm text-muted-foreground">{organization.billing_email}</p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xl font-semibold tracking-tight">Statement</p>
            <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="py-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billed to</p>
          <p className="mt-1 text-sm font-medium">
            {patient.first_name} {patient.last_name}
          </p>
          <p className="text-sm text-muted-foreground">MRN {patient.mrn}</p>
          {formatAddressLines(patient).map((line) => (
            <p key={line} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
        </div>

        {claims.length === 0 ? (
          <p className="border-t border-border py-6 text-sm text-muted-foreground">No billing activity on file.</p>
        ) : (
          <table className="w-full border-t border-border text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Service date</th>
                <th className="py-2">Claim</th>
                <th className="py-2">Provider</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Charged</th>
                <th className="py-2 text-right">Paid</th>
                <th className="py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td className="py-2 whitespace-nowrap">
                    {new Date(`${claim.service_date_from}T00:00:00`).toLocaleDateString()}
                  </td>
                  <td className="py-2">{claim.claim_number}</td>
                  <td className="py-2">{resolveProviderName(claim.providers)}</td>
                  <td className="py-2">
                    <Badge variant={CLAIM_STATUS_VARIANT[claim.status]}>{CLAIM_STATUS_LABELS[claim.status]}</Badge>
                  </td>
                  <td className="py-2 text-right">{currencyFormatter.format(Number(claim.total_charge_amount))}</td>
                  <td className="py-2 text-right">{currencyFormatter.format(Number(claim.total_paid_amount))}</td>
                  <td className="py-2 text-right">{currencyFormatter.format(Number(claim.balance_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 space-y-2 border-t border-border pt-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total charged</span>
            <span>{currencyFormatter.format(totals.totalCharged)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total paid</span>
            <span>{currencyFormatter.format(totals.totalPaid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total adjustments</span>
            <span>{currencyFormatter.format(totals.totalAdjusted)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Balance due</span>
            <span>{currencyFormatter.format(totals.totalBalance)}</span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Questions about this statement? Contact us
          {organization?.phone ? ` at ${organization.phone}` : ""}
          {organization?.billing_email ? ` or ${organization.billing_email}` : "."}
        </p>
      </div>
    </div>
  );
}
