import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound, redirect } from "next/navigation";
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
      lineItems: { select: { type: true } },
    },
  });

  if (!order) notFound();

  // Guard: redirect back if exam-only (no frame/lens line items)
  const hasFrameOrLens = order.lineItems.some(
    (li) => li.type === "FRAME" || li.type === "LENS"
  );
  if (!hasFrameOrLens) {
    redirect(`/orders/${order.id}`);
  }

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
        frameColourCode={order.frameColourCode}
        frameEyeSize={order.frameEyeSize}
        frameBridge={order.frameBridge}
        frameTemple={order.frameTemple}
        frameSku={order.frameSku}
        frameWholesale={order.frameWholesale}
        frameSource={order.frameSource}
        frameStatus={order.frameStatus}
        frameConditionNotes={order.frameConditionNotes}
        lensType={order.lensType}
        lensDesign={order.lensDesign}
        lensAddOns={order.lensAddOns}
        lensCoating={order.lensCoating}
        lensBrand={order.lensBrand}
        lensProductName={order.lensProductName}
        lensMaterial={order.lensMaterial}
        lensTint={order.lensTint}
        lensEdgeType={order.lensEdgeType}
        labNotes={order.labNotes}
        notes={order.notes}
        labOrderedAt={order.labOrderedAt}
        labReceivedAt={order.labReceivedAt}
        qcCheckedAt={order.qcCheckedAt}
        readyAt={order.readyAt}
        pickedUpAt={order.pickedUpAt}
        preparedBy={order.preparedBy}
        verifiedBy={order.verifiedBy}
        prescription={order.prescription}
        autoprint={autoprint === "true"}
      />
    </div>
  );
}
