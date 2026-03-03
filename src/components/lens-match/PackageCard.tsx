"use client";

import type { LensPackage } from "@/lib/utils/lens-packages";

interface PackageCardProps {
  pkg: LensPackage;
  variant: "primary" | "upgrade" | "alternative";
}

const variantStyles = {
  primary: {
    border: "border-primary ring-1 ring-primary",
    badge: "bg-primary text-white",
    badgeText: "Best Match",
  },
  upgrade: {
    border: "border-amber-300",
    badge: "bg-amber-100 text-amber-800",
    badgeText: "Upgrade",
  },
  alternative: {
    border: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
    badgeText: "Budget-Friendly",
  },
};

export function PackageCard({ pkg, variant }: PackageCardProps) {
  const style = variantStyles[variant];

  return (
    <div className={`bg-white rounded-xl border ${style.border} p-5 relative`}>
      <span className={`absolute -top-2.5 left-4 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${style.badge}`}>
        {style.badgeText}
      </span>
      <h3 className="text-lg font-semibold text-gray-900 mt-1">{pkg.name}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{pkg.tagline}</p>
      <p className="text-lg font-bold text-primary mt-2">
        ${pkg.priceMin}–${pkg.priceMax}
      </p>
      <ul className="mt-3 space-y-1.5">
        {pkg.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="h-4 w-4 text-primary mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
