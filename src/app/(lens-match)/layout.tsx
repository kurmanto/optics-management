import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Your Perfect Lens Match — Mint Vision Optique",
  description:
    "Take our 60-second quiz to get a personalized lens recommendation from Mint Vision Optique in Oakville.",
};

export default function LensMatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a1a2e] text-white">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-white"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">MINT VISION OPTIQUE</div>
              <div className="text-[11px] text-white/60">Doctor-Led Recommendations</div>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
