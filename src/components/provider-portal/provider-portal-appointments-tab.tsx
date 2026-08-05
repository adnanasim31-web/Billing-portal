import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { AppointmentStatus } from "@/types/database.types";

export interface ProviderPortalAppointmentRow {
  id: string;
  patientName: string;
  scheduledStart: string;
  reason: string | null;
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

export function ProviderPortalAppointmentsTab({ appointments }: { appointments: ProviderPortalAppointmentRow[] }) {
  if (appointments.length === 0) {
    return (
      <EmptyState icon={CalendarClock} title="No appointments yet" description="Your schedule will appear here." />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {appointments.map((appt) => (
        <li key={appt.id} className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">
              {new Date(appt.scheduledStart).toLocaleString(undefined, { timeZone: "UTC" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {appt.patientName}
              {appt.reason ? ` – ${appt.reason}` : ""}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[appt.status]} className="capitalize">
            {appt.status.replace("_", " ")}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
