"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarClock } from "lucide-react";
import type { AppointmentStatus, AppointmentType } from "@/types/database.types";

export interface AppointmentRow {
  id: string;
  patientName: string;
  patientMrn: string;
  providerName: string;
  appointmentType: AppointmentType;
  scheduledStart: string;
  scheduledEnd: string;
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

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const NEXT_ACTIONS: Partial<Record<AppointmentStatus, { label: string; next: AppointmentStatus }[]>> = {
  scheduled: [
    { label: "Check in", next: "checked_in" },
    { label: "Cancel", next: "cancelled" },
    { label: "Mark no-show", next: "no_show" },
  ],
  checked_in: [
    { label: "Start visit", next: "in_progress" },
    { label: "Cancel", next: "cancelled" },
  ],
  in_progress: [{ label: "Complete", next: "completed" }],
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

export function AppointmentsScheduleList({ appointments }: { appointments: AppointmentRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    if (status === "cancelled") {
      const reason = window.prompt("Reason for cancellation:");
      if (!reason) return;
      setPendingId(id);
      try {
        const res = await fetch(`/api/appointments/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, cancellationReason: reason }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error ?? "Unable to update appointment");
          return;
        }
        toast.success("Appointment cancelled");
        router.refresh();
      } finally {
        setPendingId(null);
      }
      return;
    }

    setPendingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Unable to update appointment");
        return;
      }
      toast.success(`Marked as ${STATUS_LABELS[status].toLowerCase()}`);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No appointments for this day"
        description="Schedule a new appointment to see it here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {appointments.map((appt) => {
        const actions = NEXT_ACTIONS[appt.status] ?? [];
        return (
          <li key={appt.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="w-24 shrink-0 text-sm font-medium">
                {formatTime(appt.scheduledStart)} - {formatTime(appt.scheduledEnd)}
              </div>
              <div className="min-w-0">
                <Link href={`/appointments/${appt.id}`} className="text-sm font-medium hover:underline">
                  {appt.patientName}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {appt.patientMrn} · {appt.providerName}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={STATUS_VARIANT[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
              {actions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pendingId === appt.id}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.map((action) => (
                      <DropdownMenuItem
                        key={action.next}
                        onSelect={() => handleStatusChange(appt.id, action.next)}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
