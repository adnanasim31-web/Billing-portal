"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TaskStatus } from "@/types/database.types";

const ACTIONS: Partial<Record<TaskStatus, { label: string; next: TaskStatus; variant?: "outline" | "destructive" }[]>> = {
  todo: [
    { label: "Start", next: "in_progress" },
    { label: "Cancel", next: "canceled", variant: "destructive" },
  ],
  in_progress: [
    { label: "Mark done", next: "done" },
    { label: "Cancel", next: "canceled", variant: "destructive" },
  ],
  done: [{ label: "Reopen", next: "todo", variant: "outline" }],
  canceled: [{ label: "Reopen", next: "todo", variant: "outline" }],
};

export function TaskStatusActions({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const actions = ACTIONS[status] ?? [];

  if (actions.length === 0) return null;

  async function handleClick(next: TaskStatus) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update task");
        return;
      }
      toast.success("Task updated");
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
