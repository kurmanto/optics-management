import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WorkOrderView } from "@/components/orders/WorkOrderView";

export default async function WorkOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}) {
  await verifySession();
  const { id } = await params;
  const { autoprint } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      prescription: true,
    },
  });

  if (!order) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Link
        href={`/orders/${order.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors print:hidden"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Order
      </Link>

      <WorkOrderView
        orderNumber={order.orderNumber}
        createdAt={order.createdAt}
        dueDate={order.dueDate}
        customer={order.customer}
        frameBrand={order.frameBrand}
        frameModel={order.frameModel}
        frameColor={order.frameColor}
        frameColourCode={(order as any).frameColourCode ?? null}
        frameEyeSize={(order as any).frameEyeSize ?? null}
        frameBridge={(order as any).frameBridge ?? null}
        frameTemple={(order as any).frameTemple ?? null}
        frameSku={order.frameSku}
        frameWholesale={order.frameWholesale}
        lensType={order.lensType}
        lensDesign={(order as any).lensDesign ?? null}
        lensAddOns={(order as any).lensAddOns ?? []}
        lensCoating={order.lensCoating}
        labNotes={order.labNotes}
        prescription={order.prescription}
        autoprint={autoprint === "true"}
      />
    </div>
  );
}
