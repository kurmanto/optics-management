import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

const validPOInput = {
  vendorId: "vendor-1",
  shipping: 20,
  duties: 5,
  lineItems: [
    { inventoryItemId: "item-1", quantityOrdered: 3, unitCost: 50 },
    { inventoryItemId: "item-2", quantityOrdered: 2, unitCost: 75 },
  ],
};

describe("createPurchaseOrder", () => {
  it("returns error when vendorId is missing", async () => {
    const { createPurchaseOrder } = await import("@/lib/actions/purchase-orders");
    const result = await createPurchaseOrder({ ...validPOInput, vendorId: "" });
    expect(result.error).toContain("Vendor");
  });

  it("returns error when lineItems is empty", async () => {
    const { createPurchaseOrder } = await import("@/lib/actions/purchase-orders");
    const result = await createPurchaseOrder({ ...validPOInput, lineItems: [] });
    expect(result.error).toBeDefined();
  });

  it("creates PO with correct subtotal calculation", async () => {
    const prisma = await getPrisma();
    let capturedPoData: Record<string, unknown> | null = null;

    prisma.purchaseOrder.count.mockResolvedValue(5);
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txMock = {
        ...prisma,
        purchaseOrder: {
          ...prisma.purchaseOrder,
          create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
            capturedPoData = args.data;
            return Promise.resolve({ id: "po-1" });
          }),
        },
        purchaseOrderLineItem: {
          createMany: vi.fn().mockResolvedValue({}),
        },
        inventoryItem: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(txMock);
    });

    const { createPurchaseOrder } = await import("@/lib/actions/purchase-orders");
    try {
      await createPurchaseOrder(validPOInput);
    } catch {
      // redirect throws after success
    }

    // subtotal = (3*50) + (2*75) = 150 + 150 = 300, total = 300 + 20 + 5 = 325
    expect(capturedPoData).toBeTruthy();
    expect(capturedPoData!.subtotal).toBe(300);
    expect(capturedPoData!.total).toBe(325);
  });
});

describe("createPurchaseOrder — new item creation", () => {
  function makeTxMock(opts: {
    captureInventoryCreates?: Array<unknown>;
    captureLineItems?: Array<unknown>;
  }) {
    return {
      purchaseOrder: {
        create: vi.fn().mockResolvedValue({ id: "po-new" }),
      },
      purchaseOrderLineItem: {
        create: vi.fn().mockImplementation((args: unknown) => {
          opts.captureLineItems?.push(args);
          return Promise.resolve({});
        }),
      },
      inventoryItem: {
        create: vi.fn().mockImplementation((args: unknown) => {
          opts.captureInventoryCreates?.push(args);
          return Promise.resolve({ id: "new-item-1" });
        }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
  }

  it("calls tx.inventoryItem.create when line item has brand+model but no inventoryItemId", async () => {
    const prisma = await getPrisma();
    const inventoryCreates: unknown[] = [];

    prisma.purchaseOrder.count.mockResolvedValue(10);
    prisma.inventoryItem.findMany.mockResolvedValue([]); // no SKU collisions

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(makeTxMock({ captureInventoryCreates: inventoryCreates }))
    );

    const { createPurchaseOrder } = await import("@/lib/actions/purchase-orders");
    try {
      await createPurchaseOrder({
        vendorId: "vendor-1",
        shipping: 0,
        duties: 0,
        lineItems: [{ brand: "Ray-Ban", model: "RB5154", quantityOrdered: 2, unitCost: 85 }],
      });
    } catch {
      // redirect throws after success
    }

    expect(inventoryCreates).toHaveLength(1);
    const created = inventoryCreates[0] as { data: { brand: string; model: string } };
    expect(created.data.brand).toBe("Ray-Ban");
    expect(created.data.model).toBe("RB5154");
  });

  it("calls inventoryItem.create exactly once when one new and one existing line item", async () => {
    const prisma = await getPrisma();
    const inventoryCreates: unknown[] = [];

    prisma.purchaseOrder.count.mockResolvedValue(11);
    prisma.inventoryItem.findMany.mockResolvedValue([]); // no SKU collisions

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(makeTxMock({ captureInventoryCreates: inventoryCreates }))
    );

    const { createPurchaseOrder } = await import("@/lib/actions/purchase-orders");
    try {
      await createPurchaseOrder({
        vendorId: "vendor-1",
        shipping: 0,
        duties: 0,
        lineItems: [
          { inventoryItemId: "existing-item-1", quantityOrdered: 1, unitCost: 50 },
          { brand: "Tom Ford", model: "TF5634", quantityOrdered: 1, unitCost: 120 },
        ],
      });
    } catch {
      // redirect throws after success
    }

    expect(inventoryCreates).toHaveLength(1);
  });

  it("stores grossProfit = retailPrice - unitCost on line item when retailPrice is provided", async () => {
    const prisma = await getPrisma();
    const lineItemCaptures: unknown[] = [];

    prisma.purchaseOrder.count.mockResolvedValue(12);

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(makeTxMock({ captureLineItems: lineItemCaptures }))
    );

    const { createPurchaseOrder } = await import("@/lib/actions/purchase-orders");
    try {
      await createPurchaseOrder({
        vendorId: "vendor-1",
        shipping: 0,
        duties: 0,
        lineItems: [
          { inventoryItemId: "item-1", quantityOrdered: 1, unitCost: 100, retailPrice: 250 },
        ],
      });
    } catch {
      // redirect throws after success
    }

    const li = lineItemCaptures[0] as { data: { grossProfit: number } };
    expect(li.data.grossProfit).toBe(150);
  });

  it("sets inventoryItemId: null on line item when neither inventoryItemId nor brand/model provided", async () => {
    const prisma = await getPrisma();
    const inventoryCreates: unknown[] = [];
    const lineItemCaptures: unknown[] = [];

    prisma.purchaseOrder.count.mockResolvedValue(13);

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(makeTxMock({ captureInventoryCreates: inventoryCreates, captureLineItems: lineItemCaptures }))
    );

    const { createPurchaseOrder } = await import("@/lib/actions/purchase-orders");
    try {
      await createPurchaseOrder({
        vendorId: "vendor-1",
        shipping: 0,
        duties: 0,
        lineItems: [{ quantityOrdered: 1, unitCost: 50 }],
      });
    } catch {
      // redirect throws after success
    }

    expect(inventoryCreates).toHaveLength(0);
    const li = lineItemCaptures[0] as { data: { inventoryItemId: null } };
    expect(li.data.inventoryItemId).toBeNull();
  });
});

describe("updatePOStatus", () => {
  it("updates status to SENT successfully", async () => {
    const prisma = await getPrisma();
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        purchaseOrder: {
          update: vi.fn().mockResolvedValue({}),
        },
      })
    );

    const { updatePOStatus } = await import("@/lib/actions/purchase-orders");
    const result = await updatePOStatus("po-1", "SENT");
    expect(result.error).toBeUndefined();
  });

  it("returns error when trying to cancel an already RECEIVED PO", async () => {
    const prisma = await getPrisma();
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txMock = {
        purchaseOrder: {
          findUnique: vi.fn().mockResolvedValue({
            id: "po-1",
            status: "RECEIVED",
            lineItems: [],
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        inventoryItem: { update: vi.fn().mockResolvedValue({}) },
      };
      return fn(txMock);
    });

    const { updatePOStatus } = await import("@/lib/actions/purchase-orders");
    const result = await updatePOStatus("po-1", "CANCELLED");
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/already received or cancelled/i);
  });
});

describe("receivePOItems", () => {
  function makePOWithLineItems() {
    return {
      id: "po-1",
      status: "SENT",
      shipping: 0,
      duties: 0,
      receivedAt: null,
      lineItems: [
        {
          id: "li-1",
          inventoryItemId: "item-1",
          quantityOrdered: 5,
          quantityReceived: 0,
          unitCost: 50,
          conditionNotes: null,
          inventoryItem: {
            id: "item-1",
            brand: "Ray-Ban",
            model: "RB5154",
            stockQuantity: 3,
            onOrderQty: 5,
            firstReceivedAt: null,
          },
        },
      ],
    };
  }

  it("returns error for cancelled PO", async () => {
    const prisma = await getPrisma();
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const po = { ...makePOWithLineItems(), status: "CANCELLED" };
      const txMock = {
        purchaseOrder: { findUnique: vi.fn().mockResolvedValue(po), update: vi.fn() },
        purchaseOrderLineItem: { update: vi.fn(), findMany: vi.fn() },
        inventoryItem: { update: vi.fn() },
        inventoryLedger: { create: vi.fn() },
      };
      return fn(txMock);
    });

    const { receivePOItems } = await import("@/lib/actions/purchase-orders");
    const result = await receivePOItems("po-1", [
      { lineItemId: "li-1", quantityReceived: 2 },
    ]);
    expect(result.error).toBeDefined();
  });

  it("sets PO status to RECEIVED when all items are fully received", async () => {
    const prisma = await getPrisma();
    let capturedPoUpdate: Record<string, unknown> | null = null;

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const po = makePOWithLineItems();
      const txMock = {
        purchaseOrder: {
          findUnique: vi.fn().mockResolvedValue(po),
          update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
            capturedPoUpdate = args.data;
            return Promise.resolve({});
          }),
        },
        purchaseOrderLineItem: {
          update: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([
            { quantityOrdered: 5, quantityReceived: 5 }, // fully received
          ]),
        },
        inventoryItem: { update: vi.fn().mockResolvedValue({}) },
        inventoryLedger: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(txMock);
    });

    // Mock post-transaction calls
    prisma.purchaseOrder.findUnique.mockResolvedValue({
      poNumber: "PO-2026-001",
      vendor: { name: "Safilo" },
    });
    prisma.inventoryItem.findFirst.mockResolvedValue(null); // no low stock

    const { receivePOItems } = await import("@/lib/actions/purchase-orders");
    const result = await receivePOItems("po-1", [
      { lineItemId: "li-1", quantityReceived: 5 },
    ]);

    expect(result.error).toBeUndefined();
    expect(capturedPoUpdate!.status).toBe("RECEIVED");
  });

  it("sets PO status to PARTIAL when partially received", async () => {
    const prisma = await getPrisma();
    let capturedPoUpdate: Record<string, unknown> | null = null;

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const po = makePOWithLineItems();
      const txMock = {
        purchaseOrder: {
          findUnique: vi.fn().mockResolvedValue(po),
          update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
            capturedPoUpdate = args.data;
            return Promise.resolve({});
          }),
        },
        purchaseOrderLineItem: {
          update: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([
            { quantityOrdered: 5, quantityReceived: 2 }, // partial
          ]),
        },
        inventoryItem: { update: vi.fn().mockResolvedValue({}) },
        inventoryLedger: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(txMock);
    });

    prisma.purchaseOrder.findUnique.mockResolvedValue({
      poNumber: "PO-2026-001",
      vendor: { name: "Safilo" },
    });
    prisma.inventoryItem.findFirst.mockResolvedValue(null);

    const { receivePOItems } = await import("@/lib/actions/purchase-orders");
    await receivePOItems("po-1", [{ lineItemId: "li-1", quantityReceived: 2 }]);

    expect(capturedPoUpdate!.status).toBe("PARTIAL");
  });

  it("creates a PO_RECEIVED notification", async () => {
    const prisma = await getPrisma();
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const po = makePOWithLineItems();
      const txMock = {
        purchaseOrder: {
          findUnique: vi.fn().mockResolvedValue(po),
          update: vi.fn().mockResolvedValue({}),
        },
        purchaseOrderLineItem: {
          update: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([
            { quantityOrdered: 5, quantityReceived: 5 },
          ]),
        },
        inventoryItem: { update: vi.fn().mockResolvedValue({}) },
        inventoryLedger: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(txMock);
    });

    prisma.purchaseOrder.findUnique.mockResolvedValue({
      poNumber: "PO-2026-001",
      vendor: { name: "Safilo" },
    });
    prisma.inventoryItem.findFirst.mockResolvedValue(null);

    const { createNotification } = await import("@/lib/notifications");
    const { receivePOItems } = await import("@/lib/actions/purchase-orders");
    await receivePOItems("po-1", [{ lineItemId: "li-1", quantityReceived: 5 }]);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PO_RECEIVED" })
    );
  });
});

describe("cancelPO", () => {
  it("delegates to updatePOStatus with CANCELLED", async () => {
    const prisma = await getPrisma();
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txMock = {
        purchaseOrder: {
          findUnique: vi.fn().mockResolvedValue({
            id: "po-1",
            status: "SENT",
            lineItems: [
              { id: "li-1", inventoryItemId: "item-1", quantityOrdered: 5, quantityReceived: 0 },
            ],
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        inventoryItem: { update: vi.fn().mockResolvedValue({}) },
      };
      return fn(txMock);
    });

    const { cancelPO } = await import("@/lib/actions/purchase-orders");
    const result = await cancelPO("po-1");
    expect(result.error).toBeUndefined();
  });

  it("decrements onOrderQty by the unreceived quantity for each line item", async () => {
    const prisma = await getPrisma();
    const inventoryUpdates: Array<{ id: string; decrement: number }> = [];

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txMock = {
        purchaseOrder: {
          findUnique: vi.fn().mockResolvedValue({
            id: "po-1",
            status: "SENT",
            lineItems: [
              { id: "li-1", inventoryItemId: "item-A", quantityOrdered: 10, quantityReceived: 3 },
              { id: "li-2", inventoryItemId: "item-B", quantityOrdered: 5, quantityReceived: 5 }, // fully received → no restore
              { id: "li-3", inventoryItemId: "item-C", quantityOrdered: 8, quantityReceived: 0 },
            ],
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        inventoryItem: {
          update: vi.fn().mockImplementation((args: { where: { id: string }; data: { onOrderQty: { decrement: number } } }) => {
            inventoryUpdates.push({ id: args.where.id, decrement: args.data.onOrderQty.decrement });
            return Promise.resolve({});
          }),
        },
      };
      return fn(txMock);
    });

    const { cancelPO } = await import("@/lib/actions/purchase-orders");
    await cancelPO("po-1");

    // item-A: 10 ordered - 3 received = 7 remaining → decrement 7
    expect(inventoryUpdates).toContainEqual({ id: "item-A", decrement: 7 });
    // item-B: fully received → remaining = 0 → NOT decremented
    expect(inventoryUpdates.find((u) => u.id === "item-B")).toBeUndefined();
    // item-C: 8 ordered - 0 received = 8 remaining → decrement 8
    expect(inventoryUpdates).toContainEqual({ id: "item-C", decrement: 8 });
  });
});
