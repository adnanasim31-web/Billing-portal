"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { TaskPriority, TaskStatus } from "@/types/database.types";

export interface TaskRow {
  id: string;
  title: string;
  assigneeName: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  canceled: "Canceled",
};

export const TASK_STATUS_VARIANT: Record<TaskStatus, "secondary" | "warning" | "success" | "destructive"> = {
  todo: "secondary",
  in_progress: "warning",
  done: "success",
  canceled: "destructive",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const TASK_PRIORITY_VARIANT: Record<TaskPriority, "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
};

export function TasksTable({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<TaskRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Task",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{row.original.assigneeName ?? "Unassigned"}</p>
          </div>
        ),
      },
      {
        accessorKey: "dueDate",
        header: "Due",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.dueDate ? new Date(`${row.original.dueDate}T00:00:00`).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <Badge variant={TASK_PRIORITY_VARIANT[row.original.priority]}>
            {TASK_PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={TASK_STATUS_VARIANT[row.original.status]}>{TASK_STATUS_LABELS[row.original.status]}</Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={tasks}
      emptyTitle="No tasks yet"
      emptyDescription="Create a task to start tracking work."
      pageSize={20}
      onRowClick={(task) => router.push(`/tasks/${task.id}`)}
    />
  );
}
