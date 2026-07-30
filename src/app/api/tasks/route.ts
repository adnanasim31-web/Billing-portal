import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listTasks, createTask } from "@/lib/services/task-service";
import { taskSchema, taskSearchSchema } from "@/lib/validations/tasks";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view tasks" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = taskSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    assignedTo: url.searchParams.get("assignedTo") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listTasks({
    organizationId: user.organizationId,
    query: parsed.data.query,
    status: parsed.data.status,
    assignedTo: parsed.data.assignedTo || undefined,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.TASKS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage tasks" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const task = await createTask({
    organizationId: user.organizationId,
    actingUserId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(task, { status: 201 });
}
