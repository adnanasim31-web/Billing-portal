import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listAppointments } from "@/lib/services/appointment-service";
import { listProviders } from "@/lib/services/provider-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AppointmentFilters } from "@/components/appointments/appointment-filters";
import { AppointmentsScheduleList, type AppointmentRow } from "@/components/appointments/appointments-schedule-list";
import type { AppointmentStatus } from "@/types/database.types";

export const metadata: Metadata = { title: "Appointments" };

interface AppointmentsPageProps {
  searchParams: Promise<{ date?: string; providerId?: string; status?: string }>;
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const date = params.date ?? new Date().toISOString().slice(0, 10);
  const status = (params.status as AppointmentStatus | "all" | undefined) ?? "all";

  const [appointments, { providers }] = await Promise.all([
    listAppointments({
      organizationId: user.organizationId,
      date,
      providerId: params.providerId,
      status,
    }),
    listProviders({ organizationId: user.organizationId, status: "active", pageSize: 100 }),
  ]);

  const rows: AppointmentRow[] = appointments.map((a) => ({
    id: a.id,
    patientName: a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : "Unknown patient",
    patientMrn: a.patients?.mrn ?? "",
    providerName: a.providers
      ? a.providers.provider_type === "organization"
        ? (a.providers.organization_name ?? "")
        : `${a.providers.first_name ?? ""} ${a.providers.last_name ?? ""}`.trim()
      : "Unknown provider",
    appointmentType: a.appointment_type,
    scheduledStart: a.scheduled_start,
    scheduledEnd: a.scheduled_end,
    status: a.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description={`${rows.length} appointment${rows.length === 1 ? "" : "s"} on ${new Date(
          date + "T00:00:00Z"
        ).toLocaleDateString(undefined, { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" })}`}
        action={
          <Button asChild>
            <Link href="/appointments/new">
              <Plus className="h-4 w-4" />
              Schedule appointment
            </Link>
          </Button>
        }
      />
      <AppointmentFilters
        providers={providers.map((p) => ({
          id: p.id,
          displayName:
            p.provider_type === "organization" ? (p.organization_name ?? "") : `${p.first_name} ${p.last_name}`,
        }))}
      />
      <AppointmentsScheduleList appointments={rows} />
    </div>
  );
}
