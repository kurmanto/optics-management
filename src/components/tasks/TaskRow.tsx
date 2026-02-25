"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flag, MessageSquare, ChevronDown } from "lucide-react";
import { updateTaskStatus, updateTask } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/utils/formatters";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_COLORS,
} from "@/lib/types/task";
import { cn } from "@/lib/utils/cn";

type TaskRowProps = {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    dueDate: Date | null;
    assigneeRole: string | null;
    customer: { id: string; firstName: string; lastName: string } | null;
    assignee: { id: string; name: string } | null;
    _count: { comments: number };
  };
  isOverdue: boolean;
  openHref: string;
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "DONE", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "DONE", "CANCELLED"],
  DONE: ["OPEN"],
  CANCELLED: ["OPEN"],
};

export function TaskRow({ task, isOverdue, openHref }: TaskRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setShowStatusMenu(false), []);

  // Close status menu on outside click or scroll
  useEffect(() => {
    if (!showStatusMenu) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        statusBtnRef.current && !statusBtnRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [showStatusMenu, closeMenu]);

  function handleStatusChange(newStatus: string, e: React.MouseEvent) {
    e.stopPropagation();
    setShowStatusMenu(false);
    startTransition(async () => {
      await updateTaskStatus({ id: task.id, status: newStatus });
    });
  }

  function handleToggleUrgent(e: React.MouseEvent) {
    e.stopPropagation();
    const newPriority = task.priority === "URGENT" ? "NORMAL" : "URGENT";
    startTransition(async () => {
      await updateTask({ id: task.id, priority: newPriority });
    });
  }

  function handleRowClick() {
    router.push(openHref);
  }

  const transitions = STATUS_TRANSITIONS[task.status] || [];

  return (
    <tr
      onClick={handleRowClick}
      className={cn(
        "hover:bg-gray-50/50 transition-colors cursor-pointer",
        isOverdue && "bg-red-50/50",
        pending && "opacity-60"
      )}
    >
      {/* Priority — clickable toggle */}
      <td className="px-4 py-4 w-10">
        <button
          onClick={handleToggleUrgent}
          disabled={pending}
          className={cn(
            "p-1 rounded transition-colors",
            task.priority === "URGENT"
              ? "text-red-500 hover:text-red-700"
              : "text-gray-300 hover:text-red-400"
          )}
          title={task.priority === "URGENT" ? "Remove urgent" : "Mark urgent"}
        >
          <Flag className="w-4 h-4" />
        </button>
      </td>

      {/* Title */}
      <td className="px-4 py-4">
        <span className="font-medium text-gray-900">
          {task.title}
        </span>
      </td>

      {/* Patient */}
      <td className="px-4 py-4 text-gray-500 hidden md:table-cell">
        {task.customer ? (
          <Link
            href={`/customers/${task.customer.id}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary"
          >
            {task.customer.firstName} {task.customer.lastName}
          </Link>
        ) : (
          "—"
        )}
      </td>

      {/* Assignee */}
      <td className="px-4 py-4 text-gray-500 hidden md:table-cell">
        {task.assignee?.name || task.assigneeRole || "—"}
      </td>

      {/* Category */}
      <td className="px-4 py-4">
        <span
          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
            TASK_CATEGORY_COLORS[task.category] || ""
          }`}
        >
          {TASK_CATEGORY_LABELS[task.category]}
        </span>
      </td>

      {/* Due */}
      <td className="px-4 py-4 hidden md:table-cell">
        {task.dueDate ? (
          <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
            {formatDate(task.dueDate)}
          </span>
        ) : (
          "—"
        )}
      </td>

      {/* Status — clickable dropdown (portal) */}
      <td className="px-4 py-4">
        <button
          ref={statusBtnRef}
          onClick={(e) => {
            e.stopPropagation();
            if (transitions.length === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.left });
            setShowStatusMenu(!showStatusMenu);
          }}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
            TASK_STATUS_COLORS[task.status] || ""
          )}
        >
          {TASK_STATUS_LABELS[task.status]}
          {transitions.length > 0 && <ChevronDown className="w-3 h-3" />}
        </button>

        {showStatusMenu && transitions.length > 0 && createPortal(
          <div
            ref={menuRef}
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[100] py-1 min-w-[130px]"
          >
            {transitions.map((s) => (
              <button
                key={s}
                onClick={(e) => handleStatusChange(s, e)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
              >
                <span className={`inline-block px-2 py-0.5 rounded-md font-medium ${TASK_STATUS_COLORS[s]}`}>
                  {TASK_STATUS_LABELS[s]}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
      </td>

      {/* Comments */}
      <td className="px-4 py-4 text-center text-gray-400 text-xs w-12">
        {task._count.comments > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <MessageSquare className="w-3 h-3" />
            {task._count.comments}
          </span>
        )}
      </td>
    </tr>
  );
}
