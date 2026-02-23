/**
 * Playwright Global Setup
 * Runs once before all tests.
 * - Truncates and re-seeds the test database
 * - Generates session tokens for admin + staff and writes .auth/ state files
 *   (avoids browser-based login so action-ID mismatches don't block auth)
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { createHmac } from "crypto";
import { Pool } from "pg";

// Load env the same way seed-e2e.ts does
require("dotenv").config({ path: path.resolve(".env.test") });
require("dotenv").config({ path: path.resolve(".env") });

function createSessionToken(userId: string): string {
  const secret = process.env.SESSION_SECRET!;
  const payload = JSON.stringify({ userId, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function makeStorageState(token: string, baseURL: string): string {
  const url = new URL(baseURL);
  const domain = url.hostname; // "localhost"
  const now = Date.now().toString();
  // Include mvo_last_active so the idle-timeout middleware doesn't immediately
  // redirect every test to /login?reason=idle_timeout.
  return JSON.stringify({
    cookies: [
      {
        name: "mvo_session",
        value: token,
        domain,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
      {
        name: "mvo_last_active",
        value: now,
        domain,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  }, null, 2);
}

export default async function globalSetup() {
  // Ensure .auth directory exists for storage state files
  mkdirSync(path.resolve(".auth"), { recursive: true });

  console.log("\n🌱 [global-setup] Seeding test database...");

  try {
    execSync("npx tsx prisma/seed-e2e.ts", {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  } catch (error) {
    console.error("\n❌ [global-setup] Database seed failed!");
    console.error("   Make sure your DATABASE_URL is set in .env.test or .env");
    console.error("   and the database is accessible.\n");
    throw error;
  }

  console.log("✅ [global-setup] Database ready for E2E tests\n");

  // Generate session tokens programmatically — avoids browser login
  // which fails in dev mode due to server action ID churn after .next rebuild
  console.log("🔑 [global-setup] Generating auth state files...");

  const baseURL = process.env.E2E_BASE_URL || "http://localhost:3001";

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await pool.query(
      `SELECT id, email FROM users WHERE email IN ($1, $2)`,
      ["admin@mintvisionsoptique.com", "staff@mintvisionsoptique.com"]
    );

    const admin = rows.find((r: any) => r.email === "admin@mintvisionsoptique.com");
    const staff = rows.find((r: any) => r.email === "staff@mintvisionsoptique.com");

    if (!admin || !staff) {
      throw new Error("Admin or staff user not found after seed");
    }

    writeFileSync(
      path.resolve(".auth/admin.json"),
      makeStorageState(createSessionToken(admin.id), baseURL)
    );
    writeFileSync(
      path.resolve(".auth/staff.json"),
      makeStorageState(createSessionToken(staff.id), baseURL)
    );

    console.log("✅ [global-setup] Auth state files created (.auth/admin.json, .auth/staff.json)");

    // Pre-warm key routes so Next.js dev-server compiles them before tests run.
    // Without this, the first visit to each route triggers JIT compilation which
    // can take 15–30 s — causing sidebar navigation tests to time out waiting
    // for the URL to change (Next.js App Router only updates the URL after the
    // RSC response is received).
    const adminToken = createSessionToken(admin.id);
    const adminCookie = `mvo_session=${adminToken}`;
    const warmupRoutes = [
      "/dashboard",
      "/customers",
      "/forms",
      "/orders/board",
      "/orders",
      "/inventory",
      "/inventory/vendors",
      "/inventory/purchase-orders",
      "/inventory/analytics",
      "/invoices",
      "/appointments",
      "/campaigns",
      "/settings",
    ];

    console.log("🔥 [global-setup] Pre-warming routes (avoids cold-start timeouts)...");
    // Sequential (not parallel) to avoid overwhelming the dev server with
    // simultaneous DB connections, which can cause flaky test failures.
    for (const route of warmupRoutes) {
      try {
        const res = await fetch(`${baseURL}${route}`, {
          headers: { cookie: adminCookie },
          redirect: "follow",
          signal: AbortSignal.timeout(90_000),
        });
        process.stdout.write(`  ${res.status} ${route}\n`);
      } catch {
        process.stdout.write(`  (skipped ${route})\n`);
      }
    }
    console.log("✅ [global-setup] Routes warmed\n");
  } finally {
    await pool.end();
  }
}
