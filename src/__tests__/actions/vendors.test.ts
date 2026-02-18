import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";
import { makeFormData } from "../mocks/formdata";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

describe("createVendor", () => {
  it("returns fieldErrors when name is missing", async () => {
    const { createVendor } = await import("@/lib/actions/vendors");
    const fd = makeFormData({ name: "" });
    const result = await createVendor({}, fd);
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors!.name).toBeDefined();
  });

  it("calls prisma.vendor.create on valid data", async () => {
    const prisma = await getPrisma();
    prisma.vendor.create.mockResolvedValue({ id: "vendor-1" });

    const { createVendor } = await import("@/lib/actions/vendors");
    const fd = makeFormData({ name: "Safilo" });

    try {
      await createVendor({}, fd);
    } catch {
      // redirect throws
    }

    expect(prisma.vendor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Safilo" }),
      })
    );
  });

  it("returns error for invalid rep email", async () => {
    const { createVendor } = await import("@/lib/actions/vendors");
    const fd = makeFormData({ name: "Safilo", repEmail: "not-an-email" });
    const result = await createVendor({}, fd);
    expect(result.fieldErrors).toBeDefined();
  });
});

describe("updateVendor", () => {
  it("calls prisma.vendor.update with the correct id", async () => {
    const prisma = await getPrisma();
    prisma.vendor.update.mockResolvedValue({ id: "vendor-1" });

    const { updateVendor } = await import("@/lib/actions/vendors");
    const fd = makeFormData({ name: "Safilo Updated" });

    try {
      await updateVendor("vendor-1", {}, fd);
    } catch {
      // redirect throws
    }

    expect(prisma.vendor.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "vendor-1" } })
    );
  });
});

describe("deleteVendor", () => {
  it("soft-deletes by setting isActive: false", async () => {
    const prisma = await getPrisma();
    prisma.vendor.update.mockResolvedValue({});

    const { deleteVendor } = await import("@/lib/actions/vendors");
    const result = await deleteVendor("vendor-1");

    expect(result.error).toBeUndefined();
    expect(prisma.vendor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "vendor-1" },
        data: { isActive: false },
      })
    );
  });

  it("returns error when update fails", async () => {
    const prisma = await getPrisma();
    prisma.vendor.update.mockRejectedValue(new Error("DB error"));

    const { deleteVendor } = await import("@/lib/actions/vendors");
    const result = await deleteVendor("vendor-1");

    expect(result.error).toBeDefined();
  });
});
