import { notFound } from "next/navigation";
import { verifyClientSession } from "@/lib/client-dal";
import { getStyleProfile } from "@/lib/actions/client-style";
import { prisma } from "@/lib/prisma";
import { StyleQuizClient } from "@/components/client/style/StyleQuizClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function MemberStylePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const session = await verifyClientSession();

  // Verify customer belongs to family
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { familyId: true, firstName: true },
  });

  if (!customer || customer.familyId !== session.familyId) {
    notFound();
  }

  const profile = await getStyleProfile(customerId);

  return (
    <div className="space-y-4">
      <Link
        href={`/my/member/${customerId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        {customer.firstName}&apos;s Profile
      </Link>

      <StyleQuizClient
        customerId={customerId}
        existingProfile={profile}
      />
    </div>
  );
}
