import { vi } from "vitest";
import { buildPrismaMock } from "./mocks/prisma";

// ── Global mocks for Next.js modules ─────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// ── Prisma singleton mock ─────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: buildPrismaMock(),
}));

// ── Auth/DAL mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/dal", () => ({
  verifySession: vi.fn(),
  verifyAdmin: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

// ── Supabase storage mock ─────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  uploadInventoryPhoto: vi.fn().mockResolvedValue(null),
}));

// ── Auth helpers mock ─────────────────────────────────────────────────────────
// NOTE: Only mock for action tests. Auth unit tests import the real module.
