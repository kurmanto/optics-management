import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import PurchaseOrderForm from "@/components/inventory/PurchaseOrderForm";
import { createPOAction } from "@/lib/actions/purchase-orders";

export default async function NewPurchaseOrderPage() {
  await verifySession();

  const [vendors, inventoryItems] = await Promise.all([
    prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      select: { id: true, brand: true, model: true, sku: true, wholesaleCost: true },
    }),
  ]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new vendor purchase order</p>
      </div>
      <PurchaseOrderForm
        vendors={vendors}
        inventoryItems={inventoryItems}
        action={createPOAction}
      />
    </div>
  );
}
