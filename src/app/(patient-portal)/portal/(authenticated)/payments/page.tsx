import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentPortalUser, getPortalPaymentHistory } from "@/lib/services/patient-portal-service";
import { PortalPaymentsTable } from "@/components/portal/portal-payments-table";

export const metadata: Metadata = { title: "Payment History" };

function resolveProviderName(
  provider: { provider_type: string; first_name: string | null; last_name: string | null; organization_name: string | null } | null
): string {
  if (!provider) return "Unknown provider";
  return provider.provider_type === "organization"
    ? (provider.organization_name ?? "Unknown provider")
    : `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();
}

export default async function PortalPaymentHistoryPage() {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) redirect("/portal/login");

  const payments = await getPortalPaymentHistory(portalUser.patientId, portalUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Payment history</h2>
        <p className="text-sm text-muted-foreground">
          Every payment you&apos;ve made toward a statement, with a downloadable receipt for each.
        </p>
      </div>

      <PortalPaymentsTable
        payments={payments.map((payment) => ({
          id: payment.id,
          claimNumber: payment.claim?.claim_number ?? "-",
          providerName: resolveProviderName(payment.claim?.providers ?? null),
          paymentDate: payment.payment_date,
          paymentMethod: payment.payment_method,
          totalAmount: Number(payment.total_amount),
        }))}
      />
    </div>
  );
}
