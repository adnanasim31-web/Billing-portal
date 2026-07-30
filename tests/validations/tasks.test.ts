import { describe, expect, it } from "vitest";
import { taskSchema, taskStatusSchema, taskCommentSchema, taskSearchSchema } from "@/lib/validations/tasks";

describe("taskSchema", () => {
  it("accepts a minimal valid task", () => {
    expect(taskSchema.safeParse({ title: "Follow up with payer" }).success).toBe(true);
  });

  it("defaults priority to medium", () => {
    const result = taskSchema.safeParse({ title: "Follow up" });
    expect(result.success && result.data.priority).toBe("medium");
  });

  it("rejects an empty title", () => {
    expect(taskSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects a malformed due date", () => {
    expect(taskSchema.safeParse({ title: "Task", dueDate: "06/15/2026" }).success).toBe(false);
  });
});

describe("taskStatusSchema", () => {
  it("accepts a valid status", () => {
    expect(taskStatusSchema.safeParse({ status: "in_progress" }).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(taskStatusSchema.safeParse({ status: "blocked" }).success).toBe(false);
  });
});

describe("taskCommentSchema", () => {
  it("rejects an empty comment", () => {
    expect(taskCommentSchema.safeParse({ body: "" }).success).toBe(false);
  });
});

describe("taskSearchSchema", () => {
  it("defaults status to all", () => {
    const result = taskSearchSchema.safeParse({});
    expect(result.success && result.data.status).toBe("all");
  });
});
