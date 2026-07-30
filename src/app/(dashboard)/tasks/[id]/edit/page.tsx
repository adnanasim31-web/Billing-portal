import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getTaskById } from "@/lib/services/task-service";
import { listOrganizationUsers } from "@/lib/services/user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "Edit Task" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TASKS_MANAGE)) redirect("/dashboard");

  const { id } = await params;
  const [task, users] = await Promise.all([
    getTaskById(id, user.organizationId),
    listOrganizationUsers(user.organizationId),
  ]);
  if (!task) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={`Edit ${task.title}`} />
      <TaskForm
        taskId={task.id}
        assignableUsers={users.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))}
        defaultValues={{
          title: task.title,
          description: task.description ?? "",
          priority: task.priority,
          dueDate: task.due_date ?? "",
          assignedTo: task.assigned_to ?? "",
        }}
      />
    </div>
  );
}
