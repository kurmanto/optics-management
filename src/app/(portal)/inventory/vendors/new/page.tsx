import { verifySession } from "@/lib/dal";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { VendorForm } from "@/components/inventory/VendorForm";
import { createVendor } from "@/lib/actions/vendors";

export default async function NewVendorPage() {
  await verifySession();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/inventory/vendors" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Vendor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add a frame supplier or distributor</p>
        </div>
      </div>

      <VendorForm action={createVendor} />
    </div>
  );
}
