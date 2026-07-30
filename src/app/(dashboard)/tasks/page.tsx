import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListPlus } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listTasks } from "@/lib/services/task-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { TasksFilters } from "@/components/tasks/tasks-filters";
import { TasksTable, type TaskRow } from "@/components/tasks/tasks-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { TaskStatus } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Tasks" };

interface TasksPageProps {
  searchParams: Promise<{ query?: string; status?: string; page?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const status = (params.status as TaskStatus | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { tasks, total } = await listTasks({
    organizationId: user.organizationId,
    query: params.query,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    assigneeName: t.profiles ? `${t.profiles.first_name} ${t.profiles.last_name}` : null,
    priority: t.priority,
    status: t.status,
    dueDate: t.due_date,
  }));

  const canManage = hasPermission(user, PERMISSIONS.TASKS_MANAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={`${total} task${total === 1 ? "" : "s"}`}
        action={
          canManage ? (
            <Button asChild>
              <Link href="/tasks/new">
                <ListPlus className="h-4 w-4" />
                New task
              </Link>
            </Button>
          ) : undefined
        }
      />
      <TasksFilters />
      <TasksTable tasks={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
