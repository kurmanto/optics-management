import { verifySession } from "@/lib/dal";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userName={session.name} userRole={session.role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
