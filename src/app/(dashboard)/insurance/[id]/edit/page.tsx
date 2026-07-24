import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getInsuranceCompanyById } from "@/lib/services/insurance-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { InsuranceCompanyForm } from "@/components/insurance/insurance-company-form";

export const metadata: Metadata = { title: "Edit Payer" };

export default async function EditInsuranceCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.INSURANCE_MANAGE)) redirect("/dashboard");

  const { id } = await params;
  const company = await getInsuranceCompanyById(id, user.organizationId);
  if (!company) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={`Edit ${company.name}`} />
      <InsuranceCompanyForm
        companyId={company.id}
        defaultValues={{
          name: company.name,
          payerIdCode: company.payer_id_code ?? "",
          phone: company.phone ?? "",
          fax: company.fax ?? "",
          website: company.website ?? "",
          claimsAddressLine1: company.claims_address_line1 ?? "",
          claimsAddressLine2: company.claims_address_line2 ?? "",
          claimsCity: company.claims_city ?? "",
          claimsState: company.claims_state ?? "",
          claimsPostalCode: company.claims_postal_code ?? "",
          benefitsNotes: company.benefits_notes ?? "",
          isActive: company.is_active,
        }}
      />
    </div>
  );
}
