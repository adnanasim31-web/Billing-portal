import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getAppointmentById } from "@/lib/services/appointment-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentDetailActions } from "@/components/appointments/appointment-detail-actions";

export const metadata: Metadata = { title: "Appointment" };

const STATUS_VARIANT = {
  scheduled: "secondary",
  checked_in: "warning",
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
} as const;

const STATUS_LABELS = {
  scheduled: "Scheduled",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
} as const;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.APPOINTMENTS_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const appt = await getAppointmentById(id, user.organizationId);
  if (!appt) notFound();

  const patientName = appt.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : "Unknown patient";
  const providerName = appt.providers
    ? appt.providers.provider_type === "organization"
      ? (appt.providers.organization_name ?? "")
      : `${appt.providers.first_name ?? ""} ${appt.providers.last_name ?? ""}`.trim()
    : "Unknown provider";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{patientName}</h2>
            <Badge variant={STATUS_VARIANT[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(appt.scheduled_start).toLocaleString(undefined, { timeZone: "UTC" })}
          </p>
        </div>
        {appt.status !== "completed" && appt.status !== "cancelled" && appt.status !== "no_show" && (
          <Button variant="outline" asChild>
            <Link href={`/appointments/${appt.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <AppointmentDetailActions appointmentId={appt.id} status={appt.status} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field
            label="Patient"
            value={
              appt.patients ? (
                <Link href={`/patients/${appt.patients.id}`} className="hover:underline">
                  {patientName} ({appt.patients.mrn})
                </Link>
              ) : (
                patientName
              )
            }
          />
          <Field
            label="Provider"
            value={
              appt.providers ? (
                <Link href={`/providers/${appt.providers.id}`} className="hover:underline">
                  {providerName}
                </Link>
              ) : (
                providerName
              )
            }
          />
          <Field label="Type" value={appt.appointment_type.replace("_", " ")} />
          <Field label="Location" value={appt.location} />
          <Field label="Reason" value={appt.reason} />
          {appt.cancellation_reason && (
            <Field label="Cancellation reason" value={appt.cancellation_reason} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
