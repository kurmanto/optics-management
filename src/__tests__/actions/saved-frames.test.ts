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

const validFrameData = {
  customerId: "cust-1",
  brand: "Ray-Ban",
  model: "RB5154",
  color: "Black",
};

describe("saveFrame", () => {
  it("returns error when brand is missing", async () => {
    const { saveFrame } = await import("@/lib/actions/saved-frames");
    const result = await saveFrame({ ...validFrameData, brand: "" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when customerId is missing", async () => {
    const { saveFrame } = await import("@/lib/actions/saved-frames");
    const result = await saveFrame({ ...validFrameData, customerId: "" });
    expect(result).toHaveProperty("error");
  });

  it("creates saved frame on valid data", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.create.mockResolvedValue({ id: "frame-1" });

    const { saveFrame } = await import("@/lib/actions/saved-frames");
    const result = await saveFrame(validFrameData);
    expect(result).toEqual({ id: "frame-1" });
    expect(prisma.savedFrame.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: "cust-1", brand: "Ray-Ban" }),
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.create.mockRejectedValue(new Error("DB error"));

    const { saveFrame } = await import("@/lib/actions/saved-frames");
    const result = await saveFrame(validFrameData);
    expect(result).toHaveProperty("error");
  });
});

describe("uploadFramePhoto", () => {
  it("returns { url } when upload succeeds", async () => {
    const { uploadPrescriptionScan } = await import("@/lib/supabase");
    vi.mocked(uploadPrescriptionScan).mockResolvedValue("https://cdn.example.com/frame.jpg");

    const { uploadFramePhoto } = await import("@/lib/actions/saved-frames");
    const result = await uploadFramePhoto("base64data==", "image/jpeg", "cust-1");

    expect("url" in result).toBe(true);
    if ("url" in result) expect(result.url).toBe("https://cdn.example.com/frame.jpg");
    expect(uploadPrescriptionScan).toHaveBeenCalledWith("base64data==", "image/jpeg", "cust-1");
  });

  it("returns { error: 'Upload failed' } when uploadPrescriptionScan returns null", async () => {
    const { uploadPrescriptionScan } = await import("@/lib/supabase");
    vi.mocked(uploadPrescriptionScan).mockResolvedValue(null);

    const { uploadFramePhoto } = await import("@/lib/actions/saved-frames");
    const result = await uploadFramePhoto("base64data==", "image/jpeg", "cust-1");

    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toBe("Upload failed");
  });

  it("returns { error } when uploadPrescriptionScan throws", async () => {
    const { uploadPrescriptionScan } = await import("@/lib/supabase");
    vi.mocked(uploadPrescriptionScan).mockRejectedValue(new Error("Network error"));

    const { uploadFramePhoto } = await import("@/lib/actions/saved-frames");
    const result = await uploadFramePhoto("base64data==", "image/jpeg", "cust-1");

    expect("error" in result).toBe(true);
  });
});

describe("removeSavedFrame", () => {
  it("returns error when frame not found", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.findUnique.mockResolvedValue(null);

    const { removeSavedFrame } = await import("@/lib/actions/saved-frames");
    const result = await removeSavedFrame("frame-missing");
    expect((result as any).error).toBe("Frame not found");
  });

  it("deletes frame and returns success", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.findUnique.mockResolvedValue({ customerId: "cust-1" });
    prisma.savedFrame.delete.mockResolvedValue({});

    const { removeSavedFrame } = await import("@/lib/actions/saved-frames");
    const result = await removeSavedFrame("frame-1");
    expect(result).toEqual({ success: true });
    expect(prisma.savedFrame.delete).toHaveBeenCalledWith({ where: { id: "frame-1" } });
  });
});

describe("toggleFavorite", () => {
  it("returns error when frame not found", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.findUnique.mockResolvedValue(null);

    const { toggleFavorite } = await import("@/lib/actions/saved-frames");
    const result = await toggleFavorite("frame-missing");
    expect((result as any).error).toBe("Frame not found");
  });

  it("flips isFavorite from false to true", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.findUnique.mockResolvedValue({ customerId: "cust-1", isFavorite: false });
    prisma.savedFrame.update.mockResolvedValue({});

    const { toggleFavorite } = await import("@/lib/actions/saved-frames");
    const result = await toggleFavorite("frame-1");
    expect(result).toEqual({ success: true });
    expect(prisma.savedFrame.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isFavorite: true } })
    );
  });

  it("flips isFavorite from true to false", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.findUnique.mockResolvedValue({ customerId: "cust-1", isFavorite: true });
    prisma.savedFrame.update.mockResolvedValue({});

    const { toggleFavorite } = await import("@/lib/actions/saved-frames");
    await toggleFavorite("frame-1");
    expect(prisma.savedFrame.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isFavorite: false } })
    );
  });
});

describe("updateExpectedReturnDate", () => {
  it("returns error when frame not found", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.findUnique.mockResolvedValue(null);

    const { updateExpectedReturnDate } = await import("@/lib/actions/saved-frames");
    const result = await updateExpectedReturnDate("frame-missing", "2026-04-01");
    expect((result as any).error).toBe("Frame not found");
  });

  it("sets expectedReturnDate to null when date is null", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.findUnique.mockResolvedValue({ customerId: "cust-1" });
    prisma.savedFrame.update.mockResolvedValue({});

    const { updateExpectedReturnDate } = await import("@/lib/actions/saved-frames");
    const result = await updateExpectedReturnDate("frame-1", null);
    expect(result).toEqual({ success: true });
    expect(prisma.savedFrame.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { expectedReturnDate: null } })
    );
  });

  it("sets expectedReturnDate to a Date when string is provided", async () => {
    const prisma = await getPrisma();
    prisma.savedFrame.findUnique.mockResolvedValue({ customerId: "cust-1" });
    prisma.savedFrame.update.mockResolvedValue({});

    const { updateExpectedReturnDate } = await import("@/lib/actions/saved-frames");
    await updateExpectedReturnDate("frame-1", "2026-04-01");
    const call = prisma.savedFrame.update.mock.calls[0][0];
    expect(call.data.expectedReturnDate).toBeInstanceOf(Date);
  });
});
