import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProviderPortalUser, getProviderPortalClaims } from "@/lib/services/provider-portal-service";
import { ProviderPortalClaimsTab } from "@/components/provider-portal/provider-portal-claims-tab";

export const metadata: Metadata = { title: "My Claims" };

function patientName(patient: { first_name: string; last_name: string } | null): string {
  if (!patient) return "Unknown patient";
  return `${patient.first_name} ${patient.last_name}`;
}

export default async function ProviderClaimsPage() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  const claims = await getProviderPortalClaims(providerUser.providerId, providerUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Claims</h2>
        <p className="text-sm text-muted-foreground">Claims billed under your NPI.</p>
      </div>

      <ProviderPortalClaimsTab
        claims={claims.map((claim) => ({
          id: claim.id,
          claimNumber: claim.claim_number,
          patientName: patientName(claim.patients),
          serviceDateFrom: claim.service_date_from,
          status: claim.status,
          totalChargeAmount: Number(claim.total_charge_amount),
          balanceAmount: Math.max(0, Number(claim.balance_amount ?? 0)),
        }))}
      />
    </div>
  );
}
