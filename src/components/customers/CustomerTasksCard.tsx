"use client";

import { useState, useTransition } from "react";
import { Plus, X, Flag, ClipboardList } from "lucide-react";
import Link from "next/link";
import { createTask } from "@/lib/actions/tasks";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORIES,
  TASK_PRIORITY_COLORS,
} from "@/lib/types/task";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  dueDate: string | null;
  assigneeName: string | null;
};

type Staff = { id: string; name: string; role: string };

type Props = {
  customerId: string;
  customerName: string;
  tasks: Task[];
  staff: Staff[];
};

export function CustomerTasksCard({ customerId, customerName, tasks, staff }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("CLINICAL");
  const [priority, setPriority] = useState("NORMAL");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  function handleCreate() {
    if (!title.trim()) { setError("Title is required"); return; }
    setError("");
    startTransition(async () => {
      const result = await createTask({
        title: title.trim(),
        category,
        priority,
        assigneeId: assigneeId || undefined,
        customerId,
        dueDate: dueDate || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setShowForm(false);
        setTitle("");
        setCategory("CLINICAL");
        setPriority("NORMAL");
        setAssigneeId("");
        setDueDate("");
      }
    });
  }

  const now = new Date();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-gray-400" />
          Tasks
          {tasks.length > 0 && (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </h2>
      </div>

      <div className="p-5 space-y-3">
        {/* Task list */}
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((t) => {
              const isOverdue = t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE" && t.status !== "CANCELLED";
              return (
                <Link
                  key={t.id}
                  href={`/tasks?open=${t.id}`}
                  className={`block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${isOverdue ? "border-red-200 bg-red-50/50" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {t.priority === "URGENT" && <Flag className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TASK_STATUS_COLORS[t.status]}`}>
                          {TASK_STATUS_LABELS[t.status]}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TASK_PRIORITY_COLORS[t.priority]}`}>
                          {TASK_CATEGORY_LABELS[t.category]}
                        </span>
                        {t.dueDate && (
                          <span className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-400"}`}>
                            Due {new Date(t.dueDate).toLocaleDateString("en-CA")}
                          </span>
                        )}
                        {t.assigneeName && (
                          <span className="text-xs text-gray-400">{t.assigneeName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !showForm ? (
          <p className="text-sm text-gray-400 text-center py-2">No open tasks for this patient.</p>
        ) : null}

        {/* Inline form */}
        {showForm ? (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Add Task</h3>
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{TASK_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={handleCreate} disabled={pending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {pending ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}
