/**
 * Playwright Global Teardown
 * Runs once after all tests.
 * Leave the database intact for debugging failed tests locally.
 */

export default async function globalTeardown() {
  // Intentionally left empty — data is useful for debugging locally.
  // To clean up, add truncation logic here.
  console.log("\n🏁 [global-teardown] E2E test run complete.");
}
