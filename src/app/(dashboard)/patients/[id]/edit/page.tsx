import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/current-user-service";
import { getPatientById } from "@/lib/services/patient-service";
import { PageHeader } from "@/components/shared/page-header";
import { PatientForm } from "@/components/patients/patient-form";

export const metadata: Metadata = { title: "Edit Patient" };

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");

  const { id } = await params;
  const patient = await getPatientById(id, user.organizationId);
  if (!patient) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={`Edit ${patient.first_name} ${patient.last_name}`}
        description={`MRN ${patient.mrn}`}
      />
      <PatientForm
        patientId={patient.id}
        defaultValues={{
          firstName: patient.first_name,
          lastName: patient.last_name,
          middleName: patient.middle_name ?? "",
          preferredName: patient.preferred_name ?? "",
          dateOfBirth: patient.date_of_birth,
          sex: patient.sex,
          ssnLast4: patient.ssn_last4 ?? "",
          email: patient.email ?? "",
          phoneMobile: patient.phone_mobile ?? "",
          phoneHome: patient.phone_home ?? "",
          addressLine1: patient.address_line1 ?? "",
          addressLine2: patient.address_line2 ?? "",
          city: patient.city ?? "",
          state: patient.state ?? "",
          postalCode: patient.postal_code ?? "",
          preferredLanguage: patient.preferred_language,
          status: patient.status,
        }}
      />
    </div>
  );
}
