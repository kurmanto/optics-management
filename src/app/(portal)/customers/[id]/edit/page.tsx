import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { updateCustomer } from "@/lib/actions/customers";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const [customer, families] = await Promise.all([
    prisma.customer.findUnique({ where: { id, isActive: true } }),
    prisma.family.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!customer) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/customers/${id}`}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Edit {customer.firstName} {customer.lastName}
        </h1>
      </div>

      <CustomerForm action={action} customer={customer} families={families} />
    </div>
  );
}
