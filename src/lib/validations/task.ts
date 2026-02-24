import { z } from "zod";

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category: z.enum(["CLINICAL", "ADMIN", "LAB", "MARKETING"]),
  priority: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
  assigneeId: z.string().optional(),
  assigneeRole: z.string().optional(),
  customerId: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().max(2000).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  id: z.string().min(1, "Task ID is required"),
  title: z.string().min(1).max(200).optional(),
  category: z.enum(["CLINICAL", "ADMIN", "LAB", "MARKETING"]).optional(),
  priority: z.enum(["NORMAL", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeRole: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const UpdateTaskStatusSchema = z.object({
  id: z.string().min(1, "Task ID is required"),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]),
});

export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;

export const AddTaskCommentSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});

export type AddTaskCommentInput = z.infer<typeof AddTaskCommentSchema>;
