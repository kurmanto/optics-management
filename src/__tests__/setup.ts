import { vi } from "vitest";
import { buildPrismaMock } from "./mocks/prisma";

// ── Global mocks for Next.js modules ─────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
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

vi.mock("@/lib/dal", () => {
  const verifySession = vi.fn();
  const verifyAdmin = vi.fn();
  // verifyRole delegates to verifySession so action tests don't need separate setup
  const verifyRole = vi.fn().mockImplementation(async () => verifySession());
  return { verifySession, verifyAdmin, verifyRole };
});

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

// ── Client auth/DAL mocks ────────────────────────────────────────────────────

vi.mock("@/lib/client-dal", () => ({
  verifyClientSession: vi.fn(),
}));

vi.mock("@/lib/client-auth", () => ({
  createClientSession: vi.fn(),
  getClientSession: vi.fn(),
  destroyClientSession: vi.fn(),
  verifyClientPassword: vi.fn(),
  hashClientPassword: vi.fn(),
  CLIENT_COOKIE_NAMES: { session: "mvo_client_session", lastActive: "mvo_client_last_active" },
}));

// ── Supabase storage mock ─────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  uploadInventoryPhoto: vi.fn().mockResolvedValue(null),
  uploadPrescriptionScan: vi.fn().mockResolvedValue(null),
  ensurePrescriptionBucket: vi.fn().mockResolvedValue(undefined),
}));

// ── Auth helpers mock ─────────────────────────────────────────────────────────
// NOTE: Only mock for action tests. Auth unit tests import the real module.
