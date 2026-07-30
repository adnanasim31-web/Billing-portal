import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getPatientById } from "@/lib/services/patient-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EligibilityCheckForm } from "@/components/eligibility/eligibility-check-form";

export const metadata: Metadata = { title: "Run Eligibility Check" };

interface NewEligibilityCheckPageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function NewEligibilityCheckPage({ searchParams }: NewEligibilityCheckPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.ELIGIBILITY_RUN)) redirect("/dashboard");

  const params = await searchParams;
  let initialPatientLabel: string | undefined;

  if (params.patientId) {
    const patient = await getPatientById(params.patientId, user.organizationId);
    if (patient) initialPatientLabel = `${patient.first_name} ${patient.last_name}`;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Run an eligibility check"
        description="Verifies coverage against the insurance policy already on file for this patient."
      />
      <EligibilityCheckForm
        defaultValues={params.patientId ? { patientId: params.patientId } : undefined}
        initialPatientLabel={initialPatientLabel}
      />
    </div>
  );
}
