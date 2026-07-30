import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listCommentsForTask, addTaskComment } from "@/lib/services/task-service";
import { taskCommentSchema } from "@/lib/validations/tasks";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view tasks" }, { status: 403 });
  }

  const { id } = await params;
  const comments = await listCommentsForTask(id, user.organizationId);
  return NextResponse.json(comments);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.TASKS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage tasks" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = taskCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const comment = await addTaskComment({
    taskId: id,
    organizationId: user.organizationId,
    authorId: user.id,
    input: parsed.data,
  });

  return NextResponse.json(comment, { status: 201 });
}
