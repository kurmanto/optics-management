/**
 * Playwright Global Setup
 * Runs once before all tests.
 * - Truncates and re-seeds the test database
 * - Creates the .auth/ directory for session state files
 */

import { execSync } from "child_process";
import { mkdirSync } from "fs";
import path from "path";

export default async function globalSetup() {
  // Ensure .auth directory exists for storage state files
  mkdirSync(path.resolve(".auth"), { recursive: true });

  console.log("\n🌱 [global-setup] Seeding test database...");

  try {
    execSync("npx tsx prisma/seed-e2e.ts", {
      cwd: process.cwd(),
      stdio: "inherit",
      // Inherit env (which includes DATABASE_URL from .env.test or .env)
    });
  } catch (error) {
    console.error("\n❌ [global-setup] Database seed failed!");
    console.error("   Make sure your DATABASE_URL is set in .env.test or .env");
    console.error("   and the database is accessible.\n");
    throw error;
  }

  console.log("✅ [global-setup] Database ready for E2E tests\n");
}
