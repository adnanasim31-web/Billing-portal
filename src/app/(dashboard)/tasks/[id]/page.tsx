import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getTaskById, listCommentsForTask } from "@/lib/services/task-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TASK_STATUS_VARIANT,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_VARIANT,
  TASK_PRIORITY_LABELS,
} from "@/components/tasks/tasks-table";
import { TaskStatusActions } from "@/components/tasks/task-status-actions";
import { TaskCommentsSection } from "@/components/tasks/task-comments-section";

export const metadata: Metadata = { title: "Task" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const [task, comments] = await Promise.all([
    getTaskById(id, user.organizationId),
    listCommentsForTask(id, user.organizationId),
  ]);
  if (!task) notFound();

  const canManage = hasPermission(user, PERMISSIONS.TASKS_MANAGE);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{task.title}</h2>
            <Badge variant={TASK_STATUS_VARIANT[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
            <Badge variant={TASK_PRIORITY_VARIANT[task.priority]}>{TASK_PRIORITY_LABELS[task.priority]}</Badge>
          </div>
        </div>
        {canManage && (
          <Button variant="outline" asChild>
            <Link href={`/tasks/${task.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      {canManage && <TaskStatusActions taskId={task.id} status={task.status} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field
            label="Assigned to"
            value={task.profiles ? `${task.profiles.first_name} ${task.profiles.last_name}` : "Unassigned"}
          />
          <Field label="Due date" value={task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString() : null} />
          {task.completed_at && (
            <Field label="Completed" value={new Date(task.completed_at).toLocaleString()} />
          )}
          {task.description && <Field label="Description" value={task.description} />}
        </CardContent>
      </Card>

      <TaskCommentsSection
        taskId={task.id}
        canManage={canManage}
        comments={comments.map((c) => ({
          id: c.id,
          body: c.body,
          authorName: c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : "Unknown",
          createdAt: c.created_at,
        }))}
      />
    </div>
  );
}
