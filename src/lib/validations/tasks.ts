import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const TASK_STATUSES = ["todo", "in_progress", "done", "canceled"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  dueDate: dateString.optional().or(z.literal("")),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const taskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;

export const taskCommentSchema = z.object({
  body: z.string().min(1, "Comment is required").max(2000),
});
export type TaskCommentInput = z.infer<typeof taskCommentSchema>;

export const taskSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
  status: z.enum([...TASK_STATUSES, "all"]).default("all"),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
});
export type TaskSearchInput = z.infer<typeof taskSearchSchema>;
