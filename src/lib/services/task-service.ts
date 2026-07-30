import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { TaskInput, TaskStatusInput, TaskCommentInput } from "@/lib/validations/tasks";
import type { TaskStatus } from "@/types/database.types";

const TASK_SELECT = "*, profiles:assigned_to (id, first_name, last_name)";

export interface ListTasksParams {
  organizationId: string;
  query?: string;
  status?: TaskStatus | "all";
  assignedTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listTasks(params: ListTasksParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("tasks")
    .select(TASK_SELECT, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (params.status && params.status !== "all") {
    queryBuilder = queryBuilder.eq("status", params.status);
  }
  if (params.assignedTo) {
    queryBuilder = queryBuilder.eq("assigned_to", params.assignedTo);
  }
  if (params.query) {
    queryBuilder = queryBuilder.ilike("title", `%${params.query.trim()}%`);
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { tasks: data, total: count ?? 0, page, pageSize };
}

export async function getTaskById(taskId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTask(params: { organizationId: string; actingUserId: string; input: TaskInput }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .insert({
      organization_id: params.organizationId,
      title: params.input.title,
      description: params.input.description || null,
      priority: params.input.priority,
      due_date: params.input.dueDate || null,
      assigned_to: params.input.assignedTo || null,
      created_by: params.actingUserId,
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "task.created",
    entityType: "task",
    entityId: data.id,
    metadata: { title: params.input.title },
  });

  return data;
}

export async function updateTask(params: {
  taskId: string;
  organizationId: string;
  actingUserId: string;
  input: TaskInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .update({
      title: params.input.title,
      description: params.input.description || null,
      priority: params.input.priority,
      due_date: params.input.dueDate || null,
      assigned_to: params.input.assignedTo || null,
    })
    .eq("id", params.taskId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "task.updated",
    entityType: "task",
    entityId: params.taskId,
  });

  return data;
}

export async function changeTaskStatus(params: {
  taskId: string;
  organizationId: string;
  actingUserId: string;
  input: TaskStatusInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .update({
      status: params.input.status,
      completed_at: params.input.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", params.taskId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "task.status_changed",
    entityType: "task",
    entityId: params.taskId,
    metadata: { status: params.input.status },
  });

  return data;
}

export async function listCommentsForTask(taskId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("task_comments")
    .select("*, profiles:author_id (first_name, last_name)")
    .eq("task_id", taskId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addTaskComment(params: {
  taskId: string;
  organizationId: string;
  authorId: string;
  input: TaskCommentInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("task_comments")
    .insert({
      organization_id: params.organizationId,
      task_id: params.taskId,
      author_id: params.authorId,
      body: params.input.body,
    })
    .select("*, profiles:author_id (first_name, last_name)")
    .single();
  if (error) throw error;
  return data;
}
