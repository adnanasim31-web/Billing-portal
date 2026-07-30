import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getClaimById } from "@/lib/services/claim-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ClaimForm } from "@/components/claims/claim-form";

export const metadata: Metadata = { title: "Edit Claim" };

export default async function EditClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CLAIMS_MANAGE)) redirect("/dashboard");

  const { id } = await params;
  const detail = await getClaimById(id, user.organizationId);
  if (!detail) notFound();

  const { claim } = detail;
  const patientName = claim.patients ? `${claim.patients.first_name} ${claim.patients.last_name}` : undefined;
  const providerName = claim.providers
    ? claim.providers.provider_type === "organization"
      ? (claim.providers.organization_name ?? undefined)
      : `${claim.providers.first_name ?? ""} ${claim.providers.last_name ?? ""}`.trim()
    : undefined;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={`Edit ${claim.claim_number}`} />
      <ClaimForm
        claimId={claim.id}
        initialPatientLabel={patientName}
        initialProviderLabel={providerName}
        defaultValues={{
          patientId: claim.patient_id,
          providerId: claim.provider_id,
          payerCompanyId: claim.payer_company_id ?? "",
          patientInsurancePolicyId: claim.patient_insurance_policy_id ?? "",
          serviceDateFrom: claim.service_date_from,
          serviceDateTo: claim.service_date_to,
          placeOfService: claim.place_of_service ?? "",
          notes: claim.notes ?? "",
        }}
      />
    </div>
  );
}
