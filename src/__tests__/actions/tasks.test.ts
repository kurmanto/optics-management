import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

const validTaskData = {
  title: "Follow up with Mrs. Johnson",
  category: "CLINICAL",
  priority: "NORMAL",
};

describe("createTask", () => {
  it("returns error when title is missing", async () => {
    const { createTask } = await import("@/lib/actions/tasks");
    const result = await createTask({ ...validTaskData, title: "" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when category is invalid", async () => {
    const { createTask } = await import("@/lib/actions/tasks");
    const result = await createTask({ ...validTaskData, category: "INVALID" });
    expect(result).toHaveProperty("error");
  });

  it("creates task on valid data", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.create.mockResolvedValue({ id: "task-1" });

    const { createTask } = await import("@/lib/actions/tasks");
    const result = await createTask(validTaskData);
    expect(result).toEqual({ id: "task-1" });
    expect(prisma.staffTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Follow up with Mrs. Johnson",
          category: "CLINICAL",
          createdById: "user-1",
        }),
      })
    );
  });

  it("creates task with all optional fields", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.create.mockResolvedValue({ id: "task-2" });

    const { createTask } = await import("@/lib/actions/tasks");
    const result = await createTask({
      ...validTaskData,
      assigneeId: "user-2",
      customerId: "cust-1",
      dueDate: "2026-03-15T10:00",
      description: "Check lens prescription",
    });
    expect(result).toEqual({ id: "task-2" });
    expect(prisma.staffTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assigneeId: "user-2",
          customerId: "cust-1",
          description: "Check lens prescription",
        }),
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.create.mockRejectedValue(new Error("DB error"));

    const { createTask } = await import("@/lib/actions/tasks");
    const result = await createTask(validTaskData);
    expect(result).toHaveProperty("error");
  });
});

describe("updateTask", () => {
  it("returns error when id is missing", async () => {
    const { updateTask } = await import("@/lib/actions/tasks");
    const result = await updateTask({ id: "", title: "New title" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when task not found", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue(null);

    const { updateTask } = await import("@/lib/actions/tasks");
    const result = await updateTask({ id: "task-x", title: "Updated" });
    expect((result as any).error).toBe("Task not found");
  });

  it("updates task successfully", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue({ assigneeId: null, customerId: null, isActive: true });
    prisma.staffTask.update.mockResolvedValue({});

    const { updateTask } = await import("@/lib/actions/tasks");
    const result = await updateTask({ id: "task-1", title: "Updated title" });
    expect(result).toEqual({ success: true });
    expect(prisma.staffTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: expect.objectContaining({ title: "Updated title" }),
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue({ assigneeId: null, customerId: null, isActive: true });
    prisma.staffTask.update.mockRejectedValue(new Error("DB error"));

    const { updateTask } = await import("@/lib/actions/tasks");
    const result = await updateTask({ id: "task-1", title: "x" });
    expect(result).toHaveProperty("error");
  });
});

describe("updateTaskStatus", () => {
  it("returns error when status is invalid", async () => {
    const { updateTaskStatus } = await import("@/lib/actions/tasks");
    const result = await updateTaskStatus({ id: "task-1", status: "BAD" as any });
    expect(result).toHaveProperty("error");
  });

  it("returns error when task not found", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue(null);

    const { updateTaskStatus } = await import("@/lib/actions/tasks");
    const result = await updateTaskStatus({ id: "task-x", status: "DONE" });
    expect((result as any).error).toBe("Task not found");
  });

  it("updates status to DONE and sets completedAt", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue({ customerId: null, isActive: true });
    prisma.staffTask.update.mockResolvedValue({});

    const { updateTaskStatus } = await import("@/lib/actions/tasks");
    const result = await updateTaskStatus({ id: "task-1", status: "DONE" });
    expect(result).toEqual({ success: true });
    expect(prisma.staffTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DONE",
          completedAt: expect.any(Date),
        }),
      })
    );
  });

  it("updates status to IN_PROGRESS without completedAt", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue({ customerId: null, isActive: true });
    prisma.staffTask.update.mockResolvedValue({});

    const { updateTaskStatus } = await import("@/lib/actions/tasks");
    const result = await updateTaskStatus({ id: "task-1", status: "IN_PROGRESS" });
    expect(result).toEqual({ success: true });
    const callData = prisma.staffTask.update.mock.calls[0][0].data;
    expect(callData.status).toBe("IN_PROGRESS");
    expect(callData.completedAt).toBeUndefined();
  });
});

describe("deleteTask", () => {
  it("returns error when task not found", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue(null);

    const { deleteTask } = await import("@/lib/actions/tasks");
    const result = await deleteTask("task-x");
    expect((result as any).error).toBe("Task not found");
  });

  it("soft deletes task", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue({ customerId: null, isActive: true });
    prisma.staffTask.update.mockResolvedValue({});

    const { deleteTask } = await import("@/lib/actions/tasks");
    const result = await deleteTask("task-1");
    expect(result).toEqual({ success: true });
    expect(prisma.staffTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: { isActive: false },
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue({ customerId: null, isActive: true });
    prisma.staffTask.update.mockRejectedValue(new Error("DB error"));

    const { deleteTask } = await import("@/lib/actions/tasks");
    const result = await deleteTask("task-1");
    expect(result).toHaveProperty("error");
  });
});

describe("addTaskComment", () => {
  it("returns error when body is empty", async () => {
    const { addTaskComment } = await import("@/lib/actions/tasks");
    const result = await addTaskComment({ taskId: "task-1", body: "" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when task not found", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue(null);

    const { addTaskComment } = await import("@/lib/actions/tasks");
    const result = await addTaskComment({ taskId: "task-x", body: "Hello" });
    expect((result as any).error).toBe("Task not found");
  });

  it("creates comment successfully", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.findUnique.mockResolvedValue({ isActive: true });
    prisma.taskComment.create.mockResolvedValue({ id: "comment-1" });

    const { addTaskComment } = await import("@/lib/actions/tasks");
    const result = await addTaskComment({ taskId: "task-1", body: "Working on it" });
    expect(result).toEqual({ id: "comment-1" });
    expect(prisma.taskComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: "task-1",
          authorId: "user-1",
          body: "Working on it",
        }),
      })
    );
  });
});

describe("getActiveStaff", () => {
  it("returns list of active staff", async () => {
    const prisma = await getPrisma();
    const mockStaff = [
      { id: "u1", name: "Alice", role: "STAFF" },
      { id: "u2", name: "Bob", role: "ADMIN" },
    ];
    prisma.user.findMany.mockResolvedValue(mockStaff);

    const { getActiveStaff } = await import("@/lib/actions/tasks");
    const result = await getActiveStaff();
    expect(result).toEqual(mockStaff);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    );
  });
});

describe("getTaskComments", () => {
  it("returns formatted comments", async () => {
    const prisma = await getPrisma();
    const date = new Date("2026-03-01T10:00:00.000Z");
    prisma.taskComment.findMany.mockResolvedValue([
      { id: "c1", body: "Hello", createdAt: date, author: { name: "Alice" } },
    ]);

    const { getTaskComments } = await import("@/lib/actions/tasks");
    const result = await getTaskComments("task-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "c1",
      body: "Hello",
      authorName: "Alice",
      createdAt: "2026-03-01T10:00:00.000Z",
    });
  });
});

describe("getMyOpenTaskCount", () => {
  it("returns count of open tasks for current user", async () => {
    const prisma = await getPrisma();
    prisma.staffTask.count.mockResolvedValue(5);

    const { getMyOpenTaskCount } = await import("@/lib/actions/tasks");
    const result = await getMyOpenTaskCount();
    expect(result).toBe(5);
    expect(prisma.staffTask.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        }),
      })
    );
  });
});
