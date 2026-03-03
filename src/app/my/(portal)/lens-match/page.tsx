import { verifyClientSession } from "@/lib/client-dal";
import { prisma } from "@/lib/prisma";
import { LensMatchWizard } from "@/components/lens-match/LensMatchWizard";

export default async function PortalLensMatchPage() {
  const session = await verifyClientSession();

  const members = await prisma.customer.findMany({
    where: { familyId: session.familyId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <LensMatchWizard isPortalUser={true} members={members} />
  );
}
