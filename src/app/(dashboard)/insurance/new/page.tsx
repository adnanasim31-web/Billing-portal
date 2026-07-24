import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { InsuranceCompanyForm } from "@/components/insurance/insurance-company-form";

export const metadata: Metadata = { title: "Add Payer" };

export default async function NewInsuranceCompanyPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.INSURANCE_MANAGE)) redirect("/dashboard");

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Add a payer" description="Add an insurance company to your directory." />
      <InsuranceCompanyForm />
    </div>
  );
}
