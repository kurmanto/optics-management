import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getStyleTraits, type StyleProfile } from "@/lib/utils/style-quiz";
import { Sparkles } from "lucide-react";
import Link from "next/link";

type PageProps = {
  params: Promise<{ customerId: string }>;
};

async function getPublicStyleData(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { styleProfile: true },
  });

  if (!customer?.styleProfile) return null;

  const profile = customer.styleProfile as unknown as StyleProfile;
  if (!profile?.label || !profile?.choices) return null;

  return {
    label: profile.label,
    traits: getStyleTraits(profile.choices),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { customerId } = await params;
  const data = await getPublicStyleData(customerId);

  if (!data) {
    return { title: "Style ID — Mint Vision Optique" };
  }

  return {
    title: `${data.label} — Style ID | Mint Vision Optique`,
    description: `I'm a "${data.label}" at Mint Vision Optique! ${data.traits.join(" · ")}`,
    openGraph: {
      title: `I'm a "${data.label}" at Mint Vision Optique!`,
      description: `My style DNA: ${data.traits.join(" · ")}. Take the quiz and discover your eyewear personality!`,
      siteName: "Mint Vision Optique",
      type: "website",
    },
  };
}

export default async function ShareStylePage({ params }: PageProps) {
  const { customerId } = await params;
  const data = await getPublicStyleData(customerId);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center max-w-sm">
          <p className="text-gray-500">This style profile is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-1">
            Mint Vision Optique
          </p>
          <h1 className="text-sm font-semibold text-gray-600">Style ID</h1>
        </div>

        {/* Style label card */}
        <div className="bg-gradient-to-br from-primary/5 to-purple-50 rounded-xl border border-primary/10 p-6 text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <p className="text-xs text-gray-500 mb-1">Their eyewear personality</p>
          <h2 className="text-2xl font-bold text-gray-900">{data.label}</h2>
        </div>

        {/* Style traits */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Style DNA</h3>
          <div className="flex flex-wrap gap-2">
            {data.traits.map((trait) => (
              <span
                key={trait}
                className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/my/login"
          className="block w-full text-center bg-primary text-white font-medium text-sm py-3 rounded-xl hover:bg-primary/90 transition-colors"
        >
          Take the Style ID Quiz
        </Link>

        <p className="text-center text-xs text-gray-400">
          Discover your eyewear personality at Mint Vision Optique
        </p>
      </div>
    </div>
  );
}
