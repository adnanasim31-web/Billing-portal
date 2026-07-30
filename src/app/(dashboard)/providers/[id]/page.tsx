import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getProviderById } from "@/lib/services/provider-service";
import { listProviderSchedule } from "@/lib/services/provider-schedule-service";
import { listClaimsForProvider } from "@/lib/services/claim-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ProviderHeader } from "@/components/providers/provider-header";
import { ProviderTabs } from "@/components/providers/provider-tabs";

export const metadata: Metadata = { title: "Provider Profile" };

export default async function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const provider = await getProviderById(id, user.organizationId);
  if (!provider) notFound();

  const [schedule, claims] = await Promise.all([
    listProviderSchedule(id, user.organizationId),
    listClaimsForProvider(id, user.organizationId),
  ]);

  const displayName =
    provider.provider_type === "organization"
      ? provider.organization_name ?? "Unnamed organization"
      : `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();

  return (
    <div className="space-y-6">
      <ProviderHeader
        id={provider.id}
        providerType={provider.provider_type}
        displayName={displayName}
        credentialSuffix={provider.credential_suffix}
        npi={provider.npi}
        specialty={provider.specialty}
        status={provider.status}
      />

      <ProviderTabs
        providerId={provider.id}
        overview={{
          taxId: provider.tax_id,
          taxonomyCode: provider.taxonomy_code,
          licenseNumber: provider.license_number,
          licenseState: provider.license_state,
          deaNumber: provider.dea_number,
          email: provider.email,
          phone: provider.phone,
          createdAt: provider.created_at,
        }}
        schedule={schedule.map((s) => ({
          id: s.id,
          dayOfWeek: s.day_of_week,
          startTime: s.start_time,
          endTime: s.end_time,
          location: s.location,
        }))}
        claims={claims.map((c) => ({
          id: c.id,
          claimNumber: c.claim_number,
          patientName: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : "Unknown patient",
          totalChargeAmount: Number(c.total_charge_amount),
          status: c.status,
        }))}
      />
    </div>
  );
}
