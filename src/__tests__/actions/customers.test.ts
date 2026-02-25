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

describe("createCustomer — primary contact", () => {
  it("passes primaryContact fields to prisma when provided", async () => {
    const prisma = await getPrisma();
    prisma.customer.create.mockResolvedValue({ id: "cust-pc" });

    const { createCustomer } = await import("@/lib/actions/customers");
    const fd = makeFormData({
      firstName: "Jane",
      lastName: "Doe",
      smsOptIn: "true",
      emailOptIn: "true",
      primaryContactName: "Bob Doe",
      primaryContactPhone: "6471234567",
      primaryContactEmail: "bob@example.com",
      primaryContactRelation: "Spouse",
    });

    try {
      await createCustomer({}, fd);
    } catch {
      // redirect throws after success
    }

    const callArgs = prisma.customer.create.mock.calls[0][0];
    expect(callArgs.data.primaryContactName).toBe("Bob Doe");
    expect(callArgs.data.primaryContactPhone).toBe("6471234567");
    expect(callArgs.data.primaryContactEmail).toBe("bob@example.com");
    expect(callArgs.data.primaryContactRelation).toBe("Spouse");
  });

  it("sets primaryContact fields to null when omitted", async () => {
    const prisma = await getPrisma();
    prisma.customer.create.mockResolvedValue({ id: "cust-no-pc" });

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

    const callArgs = prisma.customer.create.mock.calls[0][0];
    expect(callArgs.data.primaryContactName).toBeNull();
    expect(callArgs.data.primaryContactPhone).toBeNull();
    expect(callArgs.data.primaryContactEmail).toBeNull();
    expect(callArgs.data.primaryContactRelation).toBeNull();
  });
});

describe("updateCustomer — primary contact", () => {
  it("passes primaryContact fields to prisma.update when provided", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockResolvedValue({ id: "cust-1" });

    const { updateCustomer } = await import("@/lib/actions/customers");
    const fd = makeFormData({
      firstName: "Jane",
      lastName: "Doe",
      smsOptIn: "true",
      emailOptIn: "true",
      primaryContactName: "Alice Smith",
      primaryContactPhone: "4161234567",
      primaryContactEmail: "alice@example.com",
      primaryContactRelation: "Parent",
    });

    try {
      await updateCustomer("cust-1", {}, fd);
    } catch {
      // redirect throws
    }

    const callArgs = prisma.customer.update.mock.calls[0][0];
    expect(callArgs.data.primaryContactName).toBe("Alice Smith");
    expect(callArgs.data.primaryContactPhone).toBe("4161234567");
    expect(callArgs.data.primaryContactEmail).toBe("alice@example.com");
    expect(callArgs.data.primaryContactRelation).toBe("Parent");
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

// ── Scan Rx actions ───────────────────────────────────────────────────────────

describe("searchCustomers", () => {
  it("returns empty array for blank query", async () => {
    const { searchCustomers } = await import("@/lib/actions/customers");
    const result = await searchCustomers("   ");
    expect(result).toEqual([]);
  });

  it("returns empty array for empty string", async () => {
    const { searchCustomers } = await import("@/lib/actions/customers");
    const result = await searchCustomers("");
    expect(result).toEqual([]);
  });

  it("queries prisma with OR filter and returns results", async () => {
    const prisma = await getPrisma();
    prisma.customer.findMany.mockResolvedValue([
      { id: "cust-1", firstName: "Jane", lastName: "Doe", phone: "4165550100", email: null },
    ]);

    const { searchCustomers } = await import("@/lib/actions/customers");
    const result = await searchCustomers("Jane");

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          OR: expect.arrayContaining([
            expect.objectContaining({ firstName: expect.objectContaining({ contains: "Jane" }) }),
          ]),
        }),
        take: 10,
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe("Jane");
  });
});

describe("quickCreateCustomer", () => {
  it("returns error when firstName is missing", async () => {
    const { quickCreateCustomer } = await import("@/lib/actions/customers");
    const result = await quickCreateCustomer({ firstName: "", lastName: "Doe" });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/required/i);
  });

  it("returns error when lastName is missing", async () => {
    const { quickCreateCustomer } = await import("@/lib/actions/customers");
    const result = await quickCreateCustomer({ firstName: "Jane", lastName: "  " });
    expect("error" in result).toBe(true);
  });

  it("creates customer with minimal fields and returns id + name", async () => {
    const prisma = await getPrisma();
    prisma.customer.create.mockResolvedValue({ id: "cust-new" });

    const { quickCreateCustomer } = await import("@/lib/actions/customers");
    const result = await quickCreateCustomer({ firstName: "Jane", lastName: "Doe" });

    expect("id" in result).toBe(true);
    if ("id" in result) {
      expect(result.id).toBe("cust-new");
      expect(result.name).toBe("Jane Doe");
    }
    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ firstName: "Jane", lastName: "Doe" }),
      })
    );
  });

  it("strips non-digit chars from phone before saving", async () => {
    const prisma = await getPrisma();
    prisma.customer.create.mockResolvedValue({ id: "cust-2" });

    const { quickCreateCustomer } = await import("@/lib/actions/customers");
    await quickCreateCustomer({ firstName: "A", lastName: "B", phone: "416-555-0199" });

    const callArgs = prisma.customer.create.mock.calls[0][0];
    expect(callArgs.data.phone).toBe("4165550199");
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.customer.create.mockRejectedValue(new Error("DB error"));

    const { quickCreateCustomer } = await import("@/lib/actions/customers");
    const result = await quickCreateCustomer({ firstName: "Jane", lastName: "Doe" });
    expect("error" in result).toBe(true);
  });
});

describe("findFamilyMatches", () => {
  it("returns [] when both phone and address are null/undefined (no DB call)", async () => {
    const prisma = await getPrisma();

    const { findFamilyMatches } = await import("@/lib/actions/customers");
    const result = await findFamilyMatches(null, null);
    expect(result).toEqual([]);
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
  });

  it("returns matching customers by phone (strips non-digits)", async () => {
    const prisma = await getPrisma();
    prisma.customer.findMany.mockResolvedValue([
      { id: "cust-2", firstName: "Bob", lastName: "Smith", phone: "4165550100", familyId: null },
    ]);

    const { findFamilyMatches } = await import("@/lib/actions/customers");
    const result = await findFamilyMatches("416-555-0100");
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ phone: "4165550100" }),
          ]),
        }),
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].phone).toBe("4165550100");
  });

  it("returns matching customers by address (contains match)", async () => {
    const prisma = await getPrisma();
    prisma.customer.findMany.mockResolvedValue([
      { id: "cust-3", firstName: "Carol", lastName: "Jones", phone: null, familyId: null },
    ]);

    const { findFamilyMatches } = await import("@/lib/actions/customers");
    const result = await findFamilyMatches(null, "123 Main St");
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ address: expect.objectContaining({ contains: "123 Main St" }) }),
          ]),
        }),
      })
    );
    expect(result).toHaveLength(1);
  });

  it("excludes the target customer when excludeId is provided", async () => {
    const prisma = await getPrisma();
    prisma.customer.findMany.mockResolvedValue([]);

    const { findFamilyMatches } = await import("@/lib/actions/customers");
    await findFamilyMatches("4165550100", null, "cust-1");
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "cust-1" },
        }),
      })
    );
  });
});

describe("createFamilyAndLink", () => {
  it("returns { error } when familyName is empty string", async () => {
    const { createFamilyAndLink } = await import("@/lib/actions/customers");
    const result = await createFamilyAndLink("", ["cust-1", "cust-2"]);
    expect("error" in result).toBe(true);
  });

  it("returns { error } when customerIds array is empty", async () => {
    const { createFamilyAndLink } = await import("@/lib/actions/customers");
    const result = await createFamilyAndLink("The Smith Family", []);
    expect("error" in result).toBe(true);
  });

  it("calls family.create then customer.updateMany with all IDs, returns { familyId }", async () => {
    const prisma = await getPrisma();
    prisma.family.create.mockResolvedValue({ id: "family-1", name: "The Smith Family" });
    prisma.customer.updateMany.mockResolvedValue({ count: 2 });

    const { createFamilyAndLink } = await import("@/lib/actions/customers");
    const result = await createFamilyAndLink("The Smith Family", ["cust-1", "cust-2"]);

    expect(prisma.family.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "The Smith Family" } })
    );
    expect(prisma.customer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["cust-1", "cust-2"] } },
        data: { familyId: "family-1" },
      })
    );
    expect("familyId" in result).toBe(true);
    if ("familyId" in result) expect(result.familyId).toBe("family-1");
  });
});

describe("toggleGoogleReview", () => {
  it("sets googleReviewGiven to true with date and note", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockResolvedValue({ id: "cust-1" });

    const { toggleGoogleReview } = await import("@/lib/actions/customers");
    const result = await toggleGoogleReview("cust-1", true, "5 stars!");

    expect(result.error).toBeUndefined();
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cust-1" },
        data: expect.objectContaining({
          googleReviewGiven: true,
          googleReviewNote: "5 stars!",
        }),
      })
    );
    // Should set a date (Date instance)
    const callData = prisma.customer.update.mock.calls[0][0].data;
    expect(callData.googleReviewDate).toBeInstanceOf(Date);
  });

  it("clears review fields when given=false", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockResolvedValue({ id: "cust-1" });

    const { toggleGoogleReview } = await import("@/lib/actions/customers");
    const result = await toggleGoogleReview("cust-1", false);

    expect(result.error).toBeUndefined();
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleReviewGiven: false,
          googleReviewDate: null,
          googleReviewNote: null,
        }),
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockRejectedValue(new Error("DB error"));

    const { toggleGoogleReview } = await import("@/lib/actions/customers");
    const result = await toggleGoogleReview("cust-1", true);
    expect(result.error).toBeDefined();
  });
});

describe("addToFamily", () => {
  it("calls customer.update with familyId and returns { success: true }", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockResolvedValue({ id: "cust-1" });

    const { addToFamily } = await import("@/lib/actions/customers");
    const result = await addToFamily("family-1", "cust-1");

    expect(result).toEqual({ success: true });
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cust-1" },
        data: { familyId: "family-1" },
      })
    );
  });

  it("returns { error } when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockRejectedValue(new Error("DB error"));

    const { addToFamily } = await import("@/lib/actions/customers");
    const result = await addToFamily("family-1", "cust-missing");
    expect("error" in result).toBe(true);
  });
});
