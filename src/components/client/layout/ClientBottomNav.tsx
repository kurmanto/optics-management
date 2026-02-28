"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Users, Trophy, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/my", label: "Home", icon: Home, exact: true },
  { href: "/my/book", label: "Book", icon: Users, exact: false },
  { href: "/my/unlocks", label: "Unlocks", icon: Trophy, exact: false },
  { href: "/my/settings", label: "Settings", icon: Settings, exact: false },
];

export function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
