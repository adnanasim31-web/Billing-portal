import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getPatientById } from "@/lib/services/patient-service";
import { getProviderById } from "@/lib/services/provider-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ClaimForm } from "@/components/claims/claim-form";

export const metadata: Metadata = { title: "New Claim" };

interface NewClaimPageProps {
  searchParams: Promise<{ patientId?: string; providerId?: string }>;
}

export default async function NewClaimPage({ searchParams }: NewClaimPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CLAIMS_MANAGE)) redirect("/dashboard");

  const params = await searchParams;
  let initialPatientLabel: string | undefined;
  let initialProviderLabel: string | undefined;

  if (params.patientId) {
    const patient = await getPatientById(params.patientId, user.organizationId);
    if (patient) initialPatientLabel = `${patient.first_name} ${patient.last_name}`;
  }
  if (params.providerId) {
    const provider = await getProviderById(params.providerId, user.organizationId);
    if (provider) {
      initialProviderLabel =
        provider.provider_type === "organization"
          ? (provider.organization_name ?? undefined)
          : `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Create a new claim"
        description="Start the claim shell, then add diagnoses and procedure lines on the next screen."
      />
      <ClaimForm
        defaultValues={{
          patientId: params.patientId,
          providerId: params.providerId,
        }}
        initialPatientLabel={initialPatientLabel}
        initialProviderLabel={initialProviderLabel}
      />
    </div>
  );
}
