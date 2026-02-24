"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Trash2, Flag, Send } from "lucide-react";
import Link from "next/link";
import { updateTask, updateTaskStatus, deleteTask, addTaskComment } from "@/lib/actions/tasks";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORIES,
  TASK_CATEGORY_COLORS,
  TASK_PRIORITY_COLORS,
} from "@/lib/types/task";

type Comment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

type TaskData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeRole: string | null;
  customerId: string | null;
  customerName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdByName: string;
  createdAt: string;
  comments: Comment[];
};

type Staff = { id: string; name: string; role: string };

type Props = {
  task: TaskData;
  staff: Staff[];
};

export function TaskDetailPanel({ task, staff }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Editable fields
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [category, setCategory] = useState(task.category);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || "");
  const [assigneeRole, setAssigneeRole] = useState(task.assigneeRole || "");
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 16) : "");

  function close() {
    // Remove the "open" param
    const url = new URL(window.location.href);
    url.searchParams.delete("open");
    router.push(url.pathname + url.search);
  }

  function handleStatusChange(newStatus: string) {
    setError("");
    startTransition(async () => {
      const result = await updateTaskStatus({ id: task.id, status: newStatus });
      if ("error" in result) setError(result.error);
    });
  }

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await updateTask({
        id: task.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        priority,
        assigneeId: assigneeId || null,
        assigneeRole: assigneeRole || null,
        dueDate: dueDate || null,
      });
      if ("error" in result) setError(result.error);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this task?")) return;
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if ("error" in result) {
        setError(result.error);
      } else {
        close();
      }
    });
  }

  function handleAddComment() {
    if (!commentBody.trim()) return;
    startTransition(async () => {
      const result = await addTaskComment({ taskId: task.id, body: commentBody.trim() });
      if ("error" in result) {
        setError(result.error);
      } else {
        setCommentBody("");
      }
    });
  }

  function handleAssigneeChange(value: string) {
    if (value === "ANY_STAFF") {
      setAssigneeId("");
      setAssigneeRole("STAFF");
    } else if (value === "ANY_ADMIN") {
      setAssigneeId("");
      setAssigneeRole("ADMIN");
    } else {
      setAssigneeId(value);
      setAssigneeRole("");
    }
  }

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={close} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${TASK_STATUS_COLORS[task.status]}`}>
              {TASK_STATUS_LABELS[task.status]}
            </span>
            {task.priority === "URGENT" && (
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${TASK_PRIORITY_COLORS.URGENT}`}>
                <Flag className="w-3 h-3 inline mr-1" />Urgent
              </span>
            )}
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="w-full text-lg font-semibold text-gray-900 border-0 border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none pb-1 transition-colors"
          />

          {/* Status buttons */}
          <div className="flex flex-wrap gap-2">
            {task.status !== "OPEN" && task.status !== "DONE" && task.status !== "CANCELLED" && (
              <button
                onClick={() => handleStatusChange("OPEN")}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Reopen
              </button>
            )}
            {task.status === "OPEN" && (
              <button
                onClick={() => handleStatusChange("IN_PROGRESS")}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
              >
                Start Working
              </button>
            )}
            {(task.status === "OPEN" || task.status === "IN_PROGRESS") && (
              <button
                onClick={() => handleStatusChange("DONE")}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
              >
                Mark Done
              </button>
            )}
            {task.status !== "CANCELLED" && task.status !== "DONE" && (
              <button
                onClick={() => handleStatusChange("CANCELLED")}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); }}
                  onBlur={handleSave}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{TASK_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setPriority("NORMAL"); setTimeout(handleSave, 0); }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      priority === "NORMAL"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriority("URGENT"); setTimeout(handleSave, 0); }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      priority === "URGENT"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Urgent
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Assignee</label>
              <select
                value={assigneeId || (assigneeRole === "STAFF" ? "ANY_STAFF" : assigneeRole === "ADMIN" ? "ANY_ADMIN" : "")}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                onBlur={handleSave}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                <option value="ANY_STAFF">Any Staff</option>
                <option value="ANY_ADMIN">Any Admin</option>
                <optgroup label="Staff Members">
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={handleSave}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Patient link */}
            {task.customerId && task.customerName && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Patient</label>
                <Link
                  href={`/customers/${task.customerId}`}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {task.customerName}
                </Link>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                rows={3}
                placeholder="Add notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-100">
            <p>Created by {task.createdByName} on {new Date(task.createdAt).toLocaleDateString("en-CA")}</p>
            {task.completedAt && (
              <p>Completed on {new Date(task.completedAt).toLocaleDateString("en-CA")}</p>
            )}
          </div>

          {/* Comments */}
          <div className="pt-3 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Comments</h3>
            {task.comments.length > 0 ? (
              <div className="space-y-3 mb-4">
                {task.comments.map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{c.authorName}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString("en-CA")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{c.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No comments yet.</p>
            )}

            {/* Add comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddComment}
                disabled={pending || !commentBody.trim()}
                className="px-3 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-between">
          <button
            onClick={handleDelete}
            disabled={pending}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button onClick={close} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
