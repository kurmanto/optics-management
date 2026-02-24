"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
  AddTaskCommentSchema,
} from "@/lib/validations/task";
import { TaskStatus } from "@prisma/client";

export async function createTask(
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  const session = await verifyRole("STAFF");

  const parsed = CreateTaskSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  try {
    const task = await prisma.staffTask.create({
      data: {
        title: data.title,
        description: data.description || null,
        category: data.category,
        priority: data.priority,
        assigneeId: data.assigneeId || null,
        assigneeRole: data.assigneeRole || null,
        customerId: data.customerId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: session.id,
      },
    });

    void logAudit({
      userId: session.id,
      action: "CREATE",
      model: "StaffTask",
      recordId: task.id,
    });

    // Notify assignee if different from creator
    if (data.assigneeId && data.assigneeId !== session.id) {
      void createNotification({
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        body: data.title,
        href: `/tasks?open=${task.id}`,
        actorId: session.id,
        refId: task.id,
        refType: "StaffTask",
      });
    }

    revalidatePath("/tasks");
    if (data.customerId) revalidatePath(`/customers/${data.customerId}`);
    return { id: task.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create task" };
  }
}

export async function updateTask(
  rawData: unknown
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("STAFF");

  const parsed = UpdateTaskSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { id, ...fields } = parsed.data;

  try {
    const existing = await prisma.staffTask.findUnique({
      where: { id },
      select: { assigneeId: true, customerId: true, isActive: true },
    });
    if (!existing || !existing.isActive) return { error: "Task not found" };

    const updateData: Record<string, unknown> = {};
    if (fields.title !== undefined) updateData.title = fields.title;
    if (fields.description !== undefined) updateData.description = fields.description;
    if (fields.category !== undefined) updateData.category = fields.category;
    if (fields.priority !== undefined) updateData.priority = fields.priority;
    if (fields.assigneeId !== undefined) updateData.assigneeId = fields.assigneeId;
    if (fields.assigneeRole !== undefined) updateData.assigneeRole = fields.assigneeRole;
    if (fields.customerId !== undefined) updateData.customerId = fields.customerId;
    if (fields.dueDate !== undefined) {
      updateData.dueDate = fields.dueDate ? new Date(fields.dueDate) : null;
    }

    await prisma.staffTask.update({ where: { id }, data: updateData });

    void logAudit({
      userId: session.id,
      action: "UPDATE",
      model: "StaffTask",
      recordId: id,
      changes: { after: fields },
    });

    // Notify if reassigned to someone else
    if (
      fields.assigneeId &&
      fields.assigneeId !== existing.assigneeId &&
      fields.assigneeId !== session.id
    ) {
      void createNotification({
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        body: fields.title || "A task was assigned to you",
        href: `/tasks?open=${id}`,
        actorId: session.id,
        refId: id,
        refType: "StaffTask",
      });
    }

    revalidatePath("/tasks");
    if (existing.customerId) revalidatePath(`/customers/${existing.customerId}`);
    if (fields.customerId) revalidatePath(`/customers/${fields.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update task" };
  }
}

export async function updateTaskStatus(
  rawData: unknown
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("STAFF");

  const parsed = UpdateTaskStatusSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { id, status } = parsed.data;

  try {
    const existing = await prisma.staffTask.findUnique({
      where: { id },
      select: { customerId: true, isActive: true },
    });
    if (!existing || !existing.isActive) return { error: "Task not found" };

    await prisma.staffTask.update({
      where: { id },
      data: {
        status: status as TaskStatus,
        completedAt: status === "DONE" ? new Date() : undefined,
      },
    });

    void logAudit({
      userId: session.id,
      action: "STATUS_CHANGE",
      model: "StaffTask",
      recordId: id,
      changes: { after: { status } },
    });

    revalidatePath("/tasks");
    if (existing.customerId) revalidatePath(`/customers/${existing.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update task status" };
  }
}

export async function deleteTask(
  id: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("STAFF");

  try {
    const existing = await prisma.staffTask.findUnique({
      where: { id },
      select: { customerId: true, isActive: true },
    });
    if (!existing || !existing.isActive) return { error: "Task not found" };

    await prisma.staffTask.update({
      where: { id },
      data: { isActive: false },
    });

    void logAudit({
      userId: session.id,
      action: "DELETE",
      model: "StaffTask",
      recordId: id,
    });

    revalidatePath("/tasks");
    if (existing.customerId) revalidatePath(`/customers/${existing.customerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to delete task" };
  }
}

export async function addTaskComment(
  rawData: unknown
): Promise<{ id: string } | { error: string }> {
  const session = await verifyRole("STAFF");

  const parsed = AddTaskCommentSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { taskId, body } = parsed.data;

  try {
    const task = await prisma.staffTask.findUnique({
      where: { id: taskId },
      select: { isActive: true },
    });
    if (!task || !task.isActive) return { error: "Task not found" };

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: session.id,
        body,
      },
    });

    revalidatePath("/tasks");
    return { id: comment.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to add comment" };
  }
}

export async function getActiveStaff(): Promise<
  { id: string; name: string; role: string }[]
> {
  await verifySession();

  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getTaskComments(
  taskId: string
): Promise<{ id: string; body: string; authorName: string; createdAt: string }[]> {
  await verifySession();

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return comments.map((c) => ({
    id: c.id,
    body: c.body,
    authorName: c.author.name,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function getMyOpenTaskCount(): Promise<number> {
  const session = await verifySession();

  return prisma.staffTask.count({
    where: {
      isActive: true,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      OR: [
        { assigneeId: session.id },
        { assigneeRole: session.role },
        { createdById: session.id },
      ],
    },
  });
}
