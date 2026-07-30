import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listOrganizationUsers } from "@/lib/services/user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { TaskForm } from "@/components/tasks/task-form";

export const metadata: Metadata = { title: "New Task" };

export default async function NewTaskPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TASKS_MANAGE)) redirect("/dashboard");

  const users = await listOrganizationUsers(user.organizationId);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Create a task" />
      <TaskForm assignableUsers={users.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))} />
    </div>
  );
}
