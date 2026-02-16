import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { createCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/customers/CustomerForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewCustomerPage() {
  await verifySession();

  const families = await prisma.family.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Customer</h1>
      </div>

      <CustomerForm action={createCustomer} families={families} />
    </div>
  );
}
