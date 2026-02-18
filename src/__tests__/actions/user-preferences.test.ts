import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

const mockCookieStore = { set: vi.fn() };

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);

  const { cookies } = await import("next/headers");
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
});

describe("updateFontSizePreference", () => {
  it("calls prisma.user.update with the correct fontSizePreference", async () => {
    const prisma = await getPrisma();
    prisma.user.update.mockResolvedValue({});

    const { updateFontSizePreference } = await import(
      "@/lib/actions/user-preferences"
    );
    const result = await updateFontSizePreference("LARGE");

    expect(result.error).toBeUndefined();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockSession.id },
        data: { fontSizePreference: "LARGE" },
      })
    );
  });

  it("writes mvo_font_size cookie with lowercase value", async () => {
    const prisma = await getPrisma();
    prisma.user.update.mockResolvedValue({});

    const { updateFontSizePreference } = await import(
      "@/lib/actions/user-preferences"
    );
    await updateFontSizePreference("LARGE");

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "mvo_font_size",
      "large",
      expect.objectContaining({ path: "/" })
    );
  });

  it("calls prisma.user.update for SMALL", async () => {
    const prisma = await getPrisma();
    prisma.user.update.mockResolvedValue({});

    const { updateFontSizePreference } = await import(
      "@/lib/actions/user-preferences"
    );
    const result = await updateFontSizePreference("SMALL");

    expect(result.error).toBeUndefined();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { fontSizePreference: "SMALL" },
      })
    );
  });

  it("calls prisma.user.update for MEDIUM", async () => {
    const prisma = await getPrisma();
    prisma.user.update.mockResolvedValue({});

    const { updateFontSizePreference } = await import(
      "@/lib/actions/user-preferences"
    );
    const result = await updateFontSizePreference("MEDIUM");

    expect(result.error).toBeUndefined();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { fontSizePreference: "MEDIUM" },
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.user.update.mockRejectedValue(new Error("DB connection failed"));

    const { updateFontSizePreference } = await import(
      "@/lib/actions/user-preferences"
    );
    const result = await updateFontSizePreference("LARGE");

    expect(result.error).toBe("Failed to update font size preference");
  });

  it("calls verifySession on every invocation", async () => {
    const prisma = await getPrisma();
    prisma.user.update.mockResolvedValue({});

    const { verifySession } = await import("@/lib/dal");
    const { updateFontSizePreference } = await import(
      "@/lib/actions/user-preferences"
    );

    await updateFontSizePreference("MEDIUM");

    expect(vi.mocked(verifySession)).toHaveBeenCalled();
  });
});
