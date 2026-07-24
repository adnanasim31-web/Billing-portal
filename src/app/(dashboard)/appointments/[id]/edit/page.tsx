import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getAppointmentById } from "@/lib/services/appointment-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AppointmentForm } from "@/components/appointments/appointment-form";

export const metadata: Metadata = { title: "Edit Appointment" };

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_MANAGE)) redirect("/dashboard");

  const { id } = await params;
  const appt = await getAppointmentById(id, user.organizationId);
  if (!appt) notFound();

  const start = new Date(appt.scheduled_start);
  const end = new Date(appt.scheduled_end);
  const pad = (n: number) => String(n).padStart(2, "0");

  const patientName = appt.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : "";
  const providerName = appt.providers
    ? appt.providers.provider_type === "organization"
      ? (appt.providers.organization_name ?? "")
      : `${appt.providers.first_name ?? ""} ${appt.providers.last_name ?? ""}`.trim()
    : "";

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Edit appointment" />
      <AppointmentForm
        appointmentId={appt.id}
        initialPatientLabel={patientName}
        initialProviderLabel={providerName}
        defaultValues={{
          patientId: appt.patient_id,
          providerId: appt.provider_id,
          appointmentType: appt.appointment_type,
          date: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-${pad(start.getUTCDate())}`,
          startTime: `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())}`,
          endTime: `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`,
          reason: appt.reason ?? "",
          location: appt.location ?? "",
        }}
      />
    </div>
  );
}
