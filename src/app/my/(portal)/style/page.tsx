import { verifyClientSession } from "@/lib/client-dal";
import { getStyleProfile } from "@/lib/actions/client-style";
import { StyleQuizClient } from "@/components/client/style/StyleQuizClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function StylePage() {
  const session = await verifyClientSession();
  const profile = await getStyleProfile(session.primaryCustomerId);

  return (
    <div className="space-y-4">
      <Link
        href="/my"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      <StyleQuizClient
        customerId={session.primaryCustomerId}
        existingProfile={profile}
      />
    </div>
  );
}
