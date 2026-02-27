import { verifyClientSession } from "@/lib/client-dal";
import { prisma } from "@/lib/prisma";
import { ClientHeader } from "@/components/client/layout/ClientHeader";
import { ClientBottomNav } from "@/components/client/layout/ClientBottomNav";

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyClientSession();

  const family = await prisma.family.findUnique({
    where: { id: session.familyId },
    select: { name: true },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ClientHeader familyName={family?.name ?? "My"} />
      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4">{children}</div>
      </main>
      <ClientBottomNav />
    </div>
  );
}
