import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getProviderById } from "@/lib/services/provider-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ProviderForm } from "@/components/providers/provider-form";

export const metadata: Metadata = { title: "Edit Provider" };

export default async function EditProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_MANAGE)) redirect("/dashboard");

  const { id } = await params;
  const provider = await getProviderById(id, user.organizationId);
  if (!provider) notFound();

  const displayName =
    provider.provider_type === "organization"
      ? provider.organization_name ?? "Unnamed organization"
      : `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={`Edit ${displayName}`} description={`NPI ${provider.npi}`} />
      <ProviderForm
        providerId={provider.id}
        defaultValues={{
          providerType: provider.provider_type,
          firstName: provider.first_name ?? "",
          lastName: provider.last_name ?? "",
          credentialSuffix: provider.credential_suffix ?? "",
          organizationName: provider.organization_name ?? "",
          npi: provider.npi,
          taxId: provider.tax_id ?? "",
          specialty: provider.specialty,
          taxonomyCode: provider.taxonomy_code ?? "",
          licenseNumber: provider.license_number ?? "",
          licenseState: provider.license_state ?? "",
          deaNumber: provider.dea_number ?? "",
          email: provider.email ?? "",
          phone: provider.phone ?? "",
          status: provider.status,
        }}
      />
    </div>
  );
}
