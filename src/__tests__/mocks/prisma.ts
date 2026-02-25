import { vi } from "vitest";

function modelMock() {
  return {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  };
}

export function buildPrismaMock() {
  const mock = {
    user: modelMock(),
    customer: modelMock(),
    order: modelMock(),
    lineItem: modelMock(),
    orderStatusHistory: modelMock(),
    payment: modelMock(),
    prescription: modelMock(),
    insurancePolicy: modelMock(),
    storeCredit: modelMock(),
    medicalHistory: modelMock(),
    inventoryItem: modelMock(),
    inventoryLedger: modelMock(),
    vendor: modelMock(),
    purchaseOrder: modelMock(),
    purchaseOrderLineItem: modelMock(),
    formTemplate: modelMock(),
    formSubmission: modelMock(),
    formPackage: modelMock(),
    notification: modelMock(),
    notificationRead: modelMock(),
    notificationPreference: modelMock(),
    invoice: modelMock(),
    campaign: modelMock(),
    campaignRecipient: modelMock(),
    campaignRun: modelMock(),
    message: modelMock(),
    messageTemplate: modelMock(),
    referral: modelMock(),
    savedFrame: modelMock(),
    appointment: modelMock(),
    staffTask: modelMock(),
    taskComment: modelMock(),
    family: modelMock(),
    auditLog: modelMock(),
    breachReport: modelMock(),
    exam: modelMock(),
    systemSetting: modelMock(),
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
      if (typeof fn === "function") {
        return fn(mock);
      }
      // Array form: prisma.$transaction([promise1, promise2])
      return Promise.all(fn as unknown as Promise<unknown>[]);
    }),
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  };
  return mock;
}

export type PrismaMock = ReturnType<typeof buildPrismaMock>;
