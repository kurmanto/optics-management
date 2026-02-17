import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { updateInventoryItem } from "@/lib/actions/inventory";

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const [item, vendors] = await Promise.all([
    prisma.inventoryItem.findUnique({ where: { id, isActive: true } }),
    prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!item) notFound();

  const action = updateInventoryItem.bind(null, id);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/inventory/${id}`}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Item</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {item.brand} {item.model}
          </p>
        </div>
      </div>

      <InventoryForm action={action} item={item} vendors={vendors} />
    </div>
  );
}
