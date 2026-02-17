import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { VendorForm } from "@/components/inventory/VendorForm";
import { updateVendor } from "@/lib/actions/vendors";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id, isActive: true },
  });

  if (!vendor) notFound();

  const action = updateVendor.bind(null, id);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/inventory/vendors/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Vendor</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vendor.name}</p>
        </div>
      </div>

      <VendorForm action={action} vendor={vendor} />
    </div>
  );
}
