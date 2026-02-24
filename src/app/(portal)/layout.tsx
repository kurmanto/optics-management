import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationBar } from "@/components/layout/NotificationBar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  const taskCount = await prisma.staffTask.count({
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userName={session.name} userRole={session.role} taskCount={taskCount} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <NotificationBar userId={session.id} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
