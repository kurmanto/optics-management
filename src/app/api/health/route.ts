import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: Record<string, unknown> = {
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasSecret: !!process.env.SESSION_SECRET,
      nodeEnv: process.env.NODE_ENV,
    },
  };

  try {
    const userCount = await prisma.user.count();
    results.db = { ok: true, userCount };
  } catch (e: unknown) {
    results.db = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    const orderCount = await prisma.order.count();
    results.orders = { ok: true, orderCount };
  } catch (e: unknown) {
    results.orders = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(results);
}
