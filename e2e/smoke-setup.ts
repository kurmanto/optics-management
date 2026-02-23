/**
 * Smoke Test Global Setup — lightweight variant of global-setup.ts
 *
 * Differences from the full global-setup:
 * - Skips DB seed (smoke tests are read-only — no seed needed every run)
 * - Warms routes in parallel instead of sequentially (saves ~5 min)
 * - Only warms the routes smoke tests actually exercise
 *
 * Run the full global-setup at least once before first smoke run so the
 * .auth/ state files and test data exist.
 */

import { mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { createHmac } from "crypto";
import { Pool } from "pg";

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
  const domain = url.hostname;
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

export default async function smokeSetup() {
  mkdirSync(path.resolve(".auth"), { recursive: true });

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
      throw new Error(
        "Admin or staff user not found. Run the full test suite once first to seed the DB."
      );
    }

    // Always refresh auth state (tokens are time-based)
    writeFileSync(
      path.resolve(".auth/admin.json"),
      makeStorageState(createSessionToken(admin.id), baseURL)
    );
    writeFileSync(
      path.resolve(".auth/staff.json"),
      makeStorageState(createSessionToken(staff.id), baseURL)
    );

    console.log("✅ [smoke-setup] Auth state files refreshed");

    // Warm only the routes smoke tests visit, in parallel.
    // Parallel is safe here because we're only GETting (no mutations),
    // and the dev server handles concurrent RSC requests fine at low concurrency.
    const adminCookie = `mvo_session=${createSessionToken(admin.id)}`;
    const smokeRoutes = [
      "/dashboard",
      "/customers",
      "/forms",
      "/appointments",
      "/orders/board",
      "/orders",
      "/invoices",
      "/inventory",
      "/inventory/vendors",
      "/inventory/purchase-orders",
      "/inventory/analytics",
      "/settings",
    ];

    console.log("🔥 [smoke-setup] Pre-warming routes in parallel...");
    const results = await Promise.allSettled(
      smokeRoutes.map(async (route) => {
        const res = await fetch(`${baseURL}${route}`, {
          headers: { cookie: adminCookie },
          redirect: "follow",
          signal: AbortSignal.timeout(60_000),
        });
        return { route, status: res.status };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        process.stdout.write(`  ${r.value.status} ${r.value.route}\n`);
      } else {
        process.stdout.write(`  (failed: ${r.reason})\n`);
      }
    }
    console.log("✅ [smoke-setup] Routes warmed\n");
  } finally {
    await pool.end();
  }
}
