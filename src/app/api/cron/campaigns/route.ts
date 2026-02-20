import { NextRequest, NextResponse } from "next/server";
import { processAllCampaigns } from "@/lib/campaigns/campaign-engine";

/**
 * GET /api/cron/campaigns
 * Triggered by Vercel Cron or external scheduler.
 * Secured with Bearer token (CRON_SECRET env var).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("[cron/campaigns] Starting campaign processing run...");

  try {
    const results = await processAllCampaigns();
    const duration = Date.now() - startTime;

    const summary = {
      processedAt: new Date().toISOString(),
      durationMs: duration,
      campaigns: results.length,
      totalSent: results.reduce((s, r) => s + r.messagesSent, 0),
      totalFailed: results.reduce((s, r) => s + r.messagesFailed, 0),
      results,
    };

    console.log("[cron/campaigns] Done:", JSON.stringify(summary, null, 2));
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[cron/campaigns] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
