import { describe, it, expect } from "vitest";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
  AddTaskCommentSchema,
} from "@/lib/validations/task";

describe("CreateTaskSchema", () => {
  it("accepts valid minimal input", () => {
    const result = CreateTaskSchema.safeParse({ title: "Test task", category: "ADMIN" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("NORMAL"); // default
    }
  });

  it("accepts valid full input", () => {
    const result = CreateTaskSchema.safeParse({
      title: "Follow up",
      category: "CLINICAL",
      priority: "URGENT",
      assigneeId: "user-1",
      customerId: "cust-1",
      dueDate: "2026-03-15T10:00",
      description: "Call patient",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = CreateTaskSchema.safeParse({ title: "", category: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("rejects missing category", () => {
    const result = CreateTaskSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = CreateTaskSchema.safeParse({ title: "Test", category: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = CreateTaskSchema.safeParse({ title: "Test", category: "ADMIN", priority: "HIGH" });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 chars", () => {
    const result = CreateTaskSchema.safeParse({ title: "x".repeat(201), category: "ADMIN" });
    expect(result.success).toBe(false);
  });
});

describe("UpdateTaskSchema", () => {
  it("accepts valid update with id only", () => {
    const result = UpdateTaskSchema.safeParse({ id: "task-1" });
    expect(result.success).toBe(true);
  });

  it("accepts valid update with all fields", () => {
    const result = UpdateTaskSchema.safeParse({
      id: "task-1",
      title: "Updated",
      category: "LAB",
      priority: "URGENT",
      assigneeId: "user-2",
      dueDate: "2026-04-01T09:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = UpdateTaskSchema.safeParse({ title: "Updated" });
    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = UpdateTaskSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  it("accepts null assigneeId", () => {
    const result = UpdateTaskSchema.safeParse({ id: "task-1", assigneeId: null });
    expect(result.success).toBe(true);
  });

  it("accepts null dueDate", () => {
    const result = UpdateTaskSchema.safeParse({ id: "task-1", dueDate: null });
    expect(result.success).toBe(true);
  });
});

describe("UpdateTaskStatusSchema", () => {
  it("accepts valid status transitions", () => {
    for (const status of ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]) {
      const result = UpdateTaskStatusSchema.safeParse({ id: "task-1", status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = UpdateTaskStatusSchema.safeParse({ id: "task-1", status: "PENDING" });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = UpdateTaskStatusSchema.safeParse({ status: "DONE" });
    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = UpdateTaskStatusSchema.safeParse({ id: "", status: "DONE" });
    expect(result.success).toBe(false);
  });
});

describe("AddTaskCommentSchema", () => {
  it("accepts valid comment", () => {
    const result = AddTaskCommentSchema.safeParse({ taskId: "task-1", body: "Hello" });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    const result = AddTaskCommentSchema.safeParse({ taskId: "task-1", body: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing taskId", () => {
    const result = AddTaskCommentSchema.safeParse({ body: "Hello" });
    expect(result.success).toBe(false);
  });

  it("rejects body over 2000 chars", () => {
    const result = AddTaskCommentSchema.safeParse({ taskId: "task-1", body: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });
});
