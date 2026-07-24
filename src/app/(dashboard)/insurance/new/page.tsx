import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { InsuranceCompanyForm } from "@/components/insurance/insurance-company-form";

export const metadata: Metadata = { title: "Add Payer" };

export default function NewInsuranceCompanyPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Add a payer" description="Add an insurance company to your directory." />
      <InsuranceCompanyForm />
    </div>
  );
}
