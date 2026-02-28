"use client";

import { cn } from "@/lib/utils/cn";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface MemberSelectorProps {
  members: Member[];
  selected: string;
  onSelect: (id: string) => void;
}

export function MemberSelector({ members, selected, onSelect }: MemberSelectorProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onSelect(member.id)}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl border p-4 transition-colors text-left",
            selected === member.id
              ? "border-primary bg-primary/5"
              : "border-gray-100 hover:border-gray-200"
          )}
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {member.firstName.charAt(0)}{member.lastName.charAt(0)}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {member.firstName} {member.lastName}
          </span>
        </button>
      ))}
    </div>
  );
}
