import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProviderPortalUser, getProviderPortalAppointments } from "@/lib/services/provider-portal-service";
import { ProviderPortalAppointmentsTab } from "@/components/provider-portal/provider-portal-appointments-tab";

export const metadata: Metadata = { title: "My Appointments" };

function patientName(patient: { first_name: string; last_name: string } | null): string {
  if (!patient) return "Unknown patient";
  return `${patient.first_name} ${patient.last_name}`;
}

export default async function ProviderAppointmentsPage() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  const appointments = await getProviderPortalAppointments(providerUser.providerId, providerUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Appointments</h2>
        <p className="text-sm text-muted-foreground">Your appointment schedule.</p>
      </div>

      <ProviderPortalAppointmentsTab
        appointments={appointments.map((appt) => ({
          id: appt.id,
          patientName: patientName(appt.patients),
          scheduledStart: appt.scheduled_start,
          reason: appt.reason,
          status: appt.status,
        }))}
      />
    </div>
  );
}
