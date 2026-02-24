import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { Prisma, TaskStatus, TaskCategory, TaskPriority } from "@prisma/client";
import { Flag, MessageSquare, Search } from "lucide-react";
import {
  TASK_STATUS_LABELS,
  TASK_CATEGORY_LABELS,
} from "@/lib/types/task";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { TaskRow } from "@/components/tasks/TaskRow";

type SearchParams = {
  status?: string;
  category?: string;
  priority?: string;
  my?: string;
  q?: string;
  page?: string;
  open?: string;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  const params = await searchParams;

  const query = params.q?.trim() || "";
  const statusFilter = params.status as TaskStatus | undefined;
  const categoryFilter = params.category as TaskCategory | undefined;
  const priorityFilter = params.priority as TaskPriority | undefined;
  const myTasks = params.my !== "false"; // default ON
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 25;
  const skip = (page - 1) * limit;

  const where: Prisma.StaffTaskWhereInput = {
    isActive: true,
    ...(statusFilter ? { status: statusFilter } : { status: { not: "CANCELLED" as TaskStatus } }),
    ...(categoryFilter && { category: categoryFilter }),
    ...(priorityFilter && { priority: priorityFilter }),
    ...(myTasks && {
      OR: [
        { assigneeId: session.id },
        { assigneeRole: session.role },
        { createdById: session.id },
      ],
    }),
    ...(query && {
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
      ],
    }),
  };

  // When both myTasks and query are active, combine the ORs with AND
  if (myTasks && query) {
    where.AND = [
      {
        OR: [
          { assigneeId: session.id },
          { assigneeRole: session.role },
          { createdById: session.id },
        ],
      },
      {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      },
    ];
    delete where.OR;
  }

  const [tasks, total, staff] = await Promise.all([
    prisma.staffTask.findMany({
      where,
      orderBy: [
        { priority: "desc" }, // URGENT first (alphabetically desc)
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.staffTask.count({ where }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const now = new Date();

  // Find the open task for detail panel
  const openTaskId = params.open;
  let openTask = null;
  if (openTaskId) {
    openTask = await prisma.staffTask.findUnique({
      where: { id: openTaskId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        comments: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (query) base.q = query;
    if (statusFilter) base.status = statusFilter;
    if (categoryFilter) base.category = categoryFilter;
    if (priorityFilter) base.priority = priorityFilter;
    if (!myTasks) base.my = "false";
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...overrides };
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined) filtered[k] = v;
    }
    return `/tasks?${new URLSearchParams(filtered)}`;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} {total === 1 ? "task" : "tasks"}
          </p>
        </div>
        <CreateTaskModal staff={staff} />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* My Tasks toggle */}
        <Link
          href={myTasks ? buildUrl({ my: "false" }) : buildUrl({ my: undefined })}
          className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
            myTasks
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          My Tasks
        </Link>

        <span className="w-px h-5 bg-gray-200" />

        {/* Status filters */}
        <Link
          href={buildUrl({ status: undefined, page: undefined })}
          className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
            !statusFilter
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {(["OPEN", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: s, page: undefined })}
            className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {TASK_STATUS_LABELS[s]}
          </Link>
        ))}

        <span className="w-px h-5 bg-gray-200" />

        {/* Category filters */}
        {(["CLINICAL", "ADMIN", "LAB", "MARKETING"] as TaskCategory[]).map((c) => (
          <Link
            key={c}
            href={buildUrl({
              category: categoryFilter === c ? undefined : c,
              page: undefined,
            })}
            className={`inline-flex items-center h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              categoryFilter === c
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {TASK_CATEGORY_LABELS[c]}
          </Link>
        ))}

        <span className="w-px h-5 bg-gray-200" />

        {/* Urgent toggle */}
        <Link
          href={buildUrl({
            priority: priorityFilter === "URGENT" ? undefined : "URGENT",
            page: undefined,
          })}
          className={`inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
            priorityFilter === "URGENT"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Flag className="w-3 h-3" />
          Urgent
        </Link>

        {/* Search — inline */}
        <form className="ml-auto flex items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search tasks..."
              className="h-8 w-48 pl-8 pr-3 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:w-64 transition-all"
            />
          </div>
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
          {priorityFilter && <input type="hidden" name="priority" value={priorityFilter} />}
          {!myTasks && <input type="hidden" name="my" value="false" />}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {query || statusFilter || categoryFilter || priorityFilter
              ? "No tasks match your filters."
              : "No tasks yet."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Patient
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Assignee
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Due
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">
                  <MessageSquare className="w-3.5 h-3.5 mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task) => {
                const isOverdue = !!(
                  task.dueDate &&
                  task.dueDate < now &&
                  task.status !== "DONE" &&
                  task.status !== "CANCELLED"
                );
                const openHref = `/tasks?${new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  ...(statusFilter ? { status: statusFilter } : {}),
                  ...(categoryFilter ? { category: categoryFilter } : {}),
                  ...(priorityFilter ? { priority: priorityFilter } : {}),
                  ...(!myTasks ? { my: "false" } : {}),
                  open: task.id,
                })}`;
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isOverdue={isOverdue}
                    openHref={openHref}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {openTask && openTask.isActive && (
        <TaskDetailPanel
          task={{
            id: openTask.id,
            title: openTask.title,
            description: openTask.description,
            status: openTask.status,
            priority: openTask.priority,
            category: openTask.category,
            assigneeId: openTask.assigneeId,
            assigneeName: openTask.assignee?.name || null,
            assigneeRole: openTask.assigneeRole,
            customerId: openTask.customerId,
            customerName: openTask.customer
              ? `${openTask.customer.firstName} ${openTask.customer.lastName}`
              : null,
            dueDate: openTask.dueDate?.toISOString() || null,
            completedAt: openTask.completedAt?.toISOString() || null,
            createdByName: openTask.createdBy.name,
            createdAt: openTask.createdAt.toISOString(),
            comments: openTask.comments.map((c) => ({
              id: c.id,
              body: c.body,
              authorName: c.author.name,
              createdAt: c.createdAt.toISOString(),
            })),
          }}
          staff={staff}
        />
      )}
    </div>
  );
}
