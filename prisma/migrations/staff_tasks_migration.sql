-- Staff Tasks Migration
-- Creates task queue tables and enums for staff task management

-- Create enums
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('NORMAL', 'URGENT');
CREATE TYPE "TaskCategory" AS ENUM ('CLINICAL', 'ADMIN', 'LAB', 'MARKETING');

-- Create staff_tasks table
CREATE TABLE "staff_tasks" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
  "category" "TaskCategory" NOT NULL,
  "assignee_id" TEXT,
  "assignee_role" TEXT,
  "customer_id" TEXT,
  "due_date" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "staff_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "staff_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "staff_tasks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for staff_tasks
CREATE INDEX "staff_tasks_status_idx" ON "staff_tasks"("status");
CREATE INDEX "staff_tasks_assignee_id_idx" ON "staff_tasks"("assignee_id");
CREATE INDEX "staff_tasks_customer_id_idx" ON "staff_tasks"("customer_id");
CREATE INDEX "staff_tasks_due_date_idx" ON "staff_tasks"("due_date");
CREATE INDEX "staff_tasks_category_idx" ON "staff_tasks"("category");

-- Create task_comments table
CREATE TABLE "task_comments" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "staff_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create index for task_comments
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- Add new notification types
ALTER TYPE "NotificationType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_DUE_SOON';
