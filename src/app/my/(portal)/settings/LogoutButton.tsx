"use client";

import { clientLogout } from "@/lib/actions/client-auth";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action={clientLogout}>
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </form>
  );
}
