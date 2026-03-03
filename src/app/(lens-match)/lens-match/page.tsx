import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { LensMatchWizard } from "@/components/lens-match/LensMatchWizard";

interface PageProps {
  searchParams: Promise<{ utm_source?: string; utm_medium?: string; utm_campaign?: string }>;
}

export default async function LensMatchPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Detect if user is logged into the client portal (optional — no redirect)
  let isLoggedIn = false;
  let members: { id: string; firstName: string; lastName: string }[] = [];

  try {
    const session = await getClientSession();
    if (session) {
      isLoggedIn = true;
      members = await prisma.customer.findMany({
        where: { familyId: session.familyId, isActive: true },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: "asc" },
      });
    }
  } catch {
    // Anonymous user — continue without auth
  }

  return (
    <LensMatchWizard
      utmSource={params.utm_source}
      utmMedium={params.utm_medium}
      utmCampaign={params.utm_campaign}
      isPortalUser={isLoggedIn}
      members={members}
    />
  );
}
