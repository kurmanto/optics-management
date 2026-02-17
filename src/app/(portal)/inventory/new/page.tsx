import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { createInventoryItem } from "@/lib/actions/inventory";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewInventoryItemPage() {
  await verifySession();

  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Inventory Item</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add a new frame to your inventory</p>
        </div>
      </div>

      <InventoryForm action={createInventoryItem} vendors={vendors} />
    </div>
  );
}
