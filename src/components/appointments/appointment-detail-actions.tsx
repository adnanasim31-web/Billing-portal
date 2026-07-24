"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/types/database.types";

const ACTIONS: Partial<Record<AppointmentStatus, { label: string; next: AppointmentStatus; variant?: "outline" | "destructive" }[]>> = {
  scheduled: [
    { label: "Check in", next: "checked_in" },
    { label: "Mark no-show", next: "no_show", variant: "outline" },
    { label: "Cancel", next: "cancelled", variant: "destructive" },
  ],
  checked_in: [
    { label: "Start visit", next: "in_progress" },
    { label: "Cancel", next: "cancelled", variant: "destructive" },
  ],
  in_progress: [{ label: "Complete visit", next: "completed" }],
};

export function AppointmentDetailActions({ appointmentId, status }: { appointmentId: string; status: AppointmentStatus }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const actions = ACTIONS[status] ?? [];

  if (actions.length === 0) return null;

  async function handleClick(next: AppointmentStatus) {
    let cancellationReason: string | undefined;
    if (next === "cancelled") {
      const reason = window.prompt("Reason for cancellation:");
      if (!reason) return;
      cancellationReason = reason;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, cancellationReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update appointment");
        return;
      }
      toast.success("Appointment updated");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.next}
          variant={action.variant ?? "default"}
          disabled={isSubmitting}
          onClick={() => handleClick(action.next)}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
