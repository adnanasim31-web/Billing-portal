import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getPatientById } from "@/lib/services/patient-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AppointmentForm } from "@/components/appointments/appointment-form";

export const metadata: Metadata = { title: "Schedule Appointment" };

interface NewAppointmentPageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function NewAppointmentPage({ searchParams }: NewAppointmentPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_MANAGE)) redirect("/dashboard");

  const params = await searchParams;
  let initialPatientLabel: string | undefined;

  if (params.patientId) {
    const patient = await getPatientById(params.patientId, user.organizationId);
    if (patient) initialPatientLabel = `${patient.first_name} ${patient.last_name}`;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Schedule an appointment" description="Book a visit for a patient with a provider." />
      <AppointmentForm
        defaultValues={params.patientId ? { patientId: params.patientId } : undefined}
        initialPatientLabel={initialPatientLabel}
      />
    </div>
  );
}
