import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { PatientForm } from "@/components/patients/patient-form";

export const metadata: Metadata = { title: "Register Patient" };

export default async function NewPatientPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PATIENTS_MANAGE)) redirect("/dashboard");

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Register a new patient" description="Create a patient record and assign an MRN." />
      <PatientForm />
    </div>
  );
}
