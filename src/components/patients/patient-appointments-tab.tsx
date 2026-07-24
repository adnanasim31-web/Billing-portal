import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { AppointmentStatus } from "@/types/database.types";

export interface PatientAppointmentRow {
  id: string;
  providerName: string;
  scheduledStart: string;
  status: AppointmentStatus;
}

const STATUS_VARIANT: Record<AppointmentStatus, "secondary" | "warning" | "success" | "destructive"> = {
  scheduled: "secondary",
  checked_in: "warning",
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
};

export function PatientAppointmentsTab({
  patientId,
  appointments,
}: {
  patientId: string;
  appointments: PatientAppointmentRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" asChild>
          <Link href={`/appointments/new?patientId=${patientId}`}>
            <Plus className="h-4 w-4" />
            Schedule appointment
          </Link>
        </Button>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No appointments yet"
          description="Schedule this patient's first visit."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {appointments.map((appt) => (
            <li key={appt.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/appointments/${appt.id}`} className="text-sm font-medium hover:underline">
                  {new Date(appt.scheduledStart).toLocaleString(undefined, { timeZone: "UTC" })}
                </Link>
                <p className="text-xs text-muted-foreground">{appt.providerName}</p>
              </div>
              <Badge variant={STATUS_VARIANT[appt.status]} className="capitalize">
                {appt.status.replace("_", " ")}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
