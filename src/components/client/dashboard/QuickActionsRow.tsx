import Link from "next/link";
import { Calendar, Eye, Gift } from "lucide-react";

interface QuickActionsRowProps {
  firstMemberId?: string;
}

export function QuickActionsRow({ firstMemberId }: QuickActionsRowProps) {
  const actions = [
    { href: "/my/book", label: "Book Exam", icon: Calendar, color: "bg-primary/10 text-primary" },
    {
      href: firstMemberId ? `/my/member/${firstMemberId}` : "/my",
      label: "View Rx",
      icon: Eye,
      color: "bg-blue-50 text-blue-600",
    },
    { href: "/my/unlocks", label: "Unlocks", icon: Gift, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="flex gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-1.5 hover:border-gray-200 transition-colors"
          >
            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${action.color}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-medium text-gray-700">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
