import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";
import { makeFormData } from "../mocks/formdata";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

async function getRevalidatePath() {
  const { revalidatePath } = await import("next/cache");
  return revalidatePath as ReturnType<typeof vi.fn>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

describe("createCustomer", () => {
  it("returns fieldErrors when required fields are missing", async () => {
    const { createCustomer } = await import("@/lib/actions/customers");
    const fd = makeFormData({ firstName: "", lastName: "" });
    const result = await createCustomer({}, fd);
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors!.firstName).toBeDefined();
  });

  it("calls prisma.customer.create and revalidatePath on success", async () => {
    const prisma = await getPrisma();
    const revalidatePath = await getRevalidatePath();
    prisma.customer.create.mockResolvedValue({ id: "cust-1" });

    const { createCustomer } = await import("@/lib/actions/customers");
    const fd = makeFormData({
      firstName: "Jane",
      lastName: "Doe",
      smsOptIn: "true",
      emailOptIn: "true",
    });

    try {
      await createCustomer({}, fd);
    } catch {
      // redirect throws after success
    }

    expect(prisma.customer.create).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/customers");
  });
});

describe("updateCustomer", () => {
  it("returns fieldErrors when required fields are missing", async () => {
    const { updateCustomer } = await import("@/lib/actions/customers");
    const fd = makeFormData({ firstName: "", lastName: "" });
    const result = await updateCustomer("cust-1", {}, fd);
    expect(result.fieldErrors).toBeDefined();
  });

  it("calls prisma.customer.update with the correct id", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockResolvedValue({ id: "cust-1" });

    const { updateCustomer } = await import("@/lib/actions/customers");
    const fd = makeFormData({
      firstName: "Jane",
      lastName: "Doe",
      smsOptIn: "true",
      emailOptIn: "true",
    });

    try {
      await updateCustomer("cust-1", {}, fd);
    } catch {
      // redirect throws
    }

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cust-1" } })
    );
  });
});

describe("deleteCustomer", () => {
  it("soft-deletes by setting isActive: false", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockResolvedValue({ id: "cust-1" });

    const { deleteCustomer } = await import("@/lib/actions/customers");
    try {
      await deleteCustomer("cust-1");
    } catch {
      // redirect throws
    }

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cust-1" },
        data: { isActive: false },
      })
    );
  });
});

describe("saveMedicalHistory", () => {
  it("calls upsert with correct customerId", async () => {
    const prisma = await getPrisma();
    prisma.medicalHistory.upsert.mockResolvedValue({});

    const { saveMedicalHistory } = await import("@/lib/actions/customers");
    const fd = makeFormData({
      medications: "",
      allergies: "",
    });
    const result = await saveMedicalHistory("cust-1", {}, fd);
    expect(result.success).toBe(true);
    expect(prisma.medicalHistory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: "cust-1" },
      })
    );
  });
});

describe("addStoreCredit", () => {
  it("returns error for invalid (zero) amount", async () => {
    const { addStoreCredit } = await import("@/lib/actions/customers");
    const fd = makeFormData({ type: "REFERRAL", amount: "0" });
    const result = await addStoreCredit("cust-1", {}, fd);
    expect(result.error).toBeDefined();
  });

  it("calls prisma.storeCredit.create on valid data", async () => {
    const prisma = await getPrisma();
    prisma.storeCredit.create.mockResolvedValue({ id: "credit-1" });

    const { addStoreCredit } = await import("@/lib/actions/customers");
    const fd = makeFormData({ type: "REFERRAL", amount: "50" });
    const result = await addStoreCredit("cust-1", {}, fd);
    expect(result.success).toBe(true);
    expect(prisma.storeCredit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: "cust-1", amount: 50 }),
      })
    );
  });
});

describe("deactivateStoreCredit", () => {
  it("returns error when credit not found", async () => {
    const prisma = await getPrisma();
    prisma.storeCredit.findUnique.mockResolvedValue(null);

    const { deactivateStoreCredit } = await import("@/lib/actions/customers");
    const result = await deactivateStoreCredit("credit-99");
    expect(result.error).toBeDefined();
  });

  it("sets isActive: false on found credit", async () => {
    const prisma = await getPrisma();
    prisma.storeCredit.findUnique.mockResolvedValue({
      id: "credit-1",
      customerId: "cust-1",
    });
    prisma.storeCredit.update.mockResolvedValue({});

    const { deactivateStoreCredit } = await import("@/lib/actions/customers");
    const result = await deactivateStoreCredit("credit-1");
    expect(result.error).toBeUndefined();
    expect(prisma.storeCredit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "credit-1" },
        data: { isActive: false },
      })
    );
  });
});
