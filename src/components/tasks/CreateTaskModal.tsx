"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { Plus, X, Search } from "lucide-react";
import { createTask } from "@/lib/actions/tasks";
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS } from "@/lib/types/task";

type Staff = { id: string; name: string; role: string };

type Props = {
  staff: Staff[];
  customerId?: string;
  customerName?: string;
};

export function CreateTaskModal({ staff, customerId, customerName }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("ADMIN");
  const [priority, setPriority] = useState<string>("NORMAL");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeRole, setAssigneeRole] = useState("");
  const [linkedCustomerId, setLinkedCustomerId] = useState(customerId || "");
  const [linkedCustomerName, setLinkedCustomerName] = useState(customerName || "");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  // Patient search
  const [patientQuery, setPatientQuery] = useState(customerName || "");
  const [patientResults, setPatientResults] = useState<{ id: string; name: string }[]>([]);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      // We use a dynamic import to avoid importing prisma on the client
      const { searchCustomersForTask } = await import("@/lib/actions/tasks-client");
      const results = await searchCustomersForTask(q);
      setPatientResults(results);
      setShowPatientResults(true);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (patientQuery.length >= 2 && !linkedCustomerId) {
      searchTimeout.current = setTimeout(() => searchPatients(patientQuery), 300);
    } else {
      setPatientResults([]);
      setShowPatientResults(false);
    }
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [patientQuery, linkedCustomerId, searchPatients]);

  function handleAssigneeChange(value: string) {
    if (value === "ANY_STAFF" || value === "ANY_ADMIN") {
      setAssigneeId("");
      setAssigneeRole(value === "ANY_STAFF" ? "STAFF" : "ADMIN");
    } else {
      setAssigneeId(value);
      setAssigneeRole("");
    }
  }

  function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return; }
    setError("");
    startTransition(async () => {
      const result = await createTask({
        title: title.trim(),
        category,
        priority,
        assigneeId: assigneeId || undefined,
        assigneeRole: assigneeRole || undefined,
        customerId: linkedCustomerId || undefined,
        dueDate: dueDate || undefined,
        description: description.trim() || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setOpen(false);
        resetForm();
      }
    });
  }

  function resetForm() {
    setTitle("");
    setCategory("ADMIN");
    setPriority("NORMAL");
    setAssigneeId("");
    setAssigneeRole("");
    setLinkedCustomerId(customerId || "");
    setLinkedCustomerName(customerName || "");
    setPatientQuery(customerName || "");
    setDueDate("");
    setDescription("");
    setError("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
      >
        <Plus className="w-4 h-4" />
        New Task
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">New Task</h2>
            <button onClick={() => { setOpen(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Follow up with patient about new lenses"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  {TASK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{TASK_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority("NORMAL")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      priority === "NORMAL"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("URGENT")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
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

            {/* Assign to */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assign to</label>
              <select
                value={assigneeId || (assigneeRole === "STAFF" ? "ANY_STAFF" : assigneeRole === "ADMIN" ? "ANY_ADMIN" : "")}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
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

            {/* Link to patient */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">Link to patient (optional)</label>
              {linkedCustomerId ? (
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg">
                  <span className="text-sm text-gray-900 flex-1">{linkedCustomerName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkedCustomerId("");
                      setLinkedCustomerName("");
                      setPatientQuery("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {showPatientResults && patientResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            setLinkedCustomerId(p.id);
                            setLinkedCustomerName(p.name);
                            setPatientQuery(p.name);
                            setShowPatientResults(false);
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due date (optional)</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description / Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Additional details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => { setOpen(false); resetForm(); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={pending}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {pending ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
