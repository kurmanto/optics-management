import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NewOrderWizard } from "@/components/orders/NewOrderWizard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await verifySession();

  const params = await searchParams;
  const customerId = params.customerId;

  const [allCustomers, customer, prescriptions, insurancePolicies, inventoryItems] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    customerId
      ? prisma.customer.findUnique({
          where: { id: customerId, isActive: true },
          select: { id: true, firstName: true, lastName: true, phone: true },
        })
      : null,
    customerId
      ? prisma.prescription.findMany({
          where: { customerId, isActive: true },
          orderBy: { date: "desc" },
          select: { id: true, date: true, odSphere: true, osSphere: true },
        })
      : [],
    customerId
      ? prisma.insurancePolicy.findMany({
          where: { customerId, isActive: true },
          select: { id: true, providerName: true, policyNumber: true },
        })
      : [],
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, brand: true, model: true, color: true, sku: true, retailPrice: true, wholesaleCost: true },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
    }),
  ]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/orders"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
      </div>

      <NewOrderWizard
        customer={customer || undefined}
        allCustomers={allCustomers}
        prescriptions={prescriptions}
        insurancePolicies={insurancePolicies}
        inventoryItems={inventoryItems}
      />
    </div>
  );
}
